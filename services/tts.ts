
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ITextToSpeechProvider, AudioResult, TranslationResult } from '../types';

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";

  private decodeBase64ToPCM(base64: string): Int16Array {
    const binaryString = atob(base64);
    const buffer = new ArrayBuffer(binaryString.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    // Gemini TTS returns 16-bit PCM (2 bytes per sample)
    return new Int16Array(buffer);
  }

  private addWavHeader(pcmData: Int16Array, sampleRate: number): Blob {
    const totalDataLen = pcmData.length * 2;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (v: DataView, o: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalDataLen + 36, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, totalDataLen, true);

    return new Blob([header, pcmData], { type: 'audio/wav' });
  }

  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const sampleRate = 24000;
    const segments = translation.segments;
    
    if (!segments || segments.length === 0) throw new Error("No segments for dubbing.");

    // Determine duration and buffer size
    const maxEnd = Math.max(...segments.map(s => Number(s.end)));
    const totalSamples = Math.ceil((maxEnd + 2) * sampleRate); // +2s buffer for safety
    const finalPCM = new Int16Array(totalSamples);

    console.log(`Dubbing Engine: Processing ${segments.length} segments into ${maxEnd}s master track.`);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg.text || !seg.text.trim()) continue;

      try {
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: seg.text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { 
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } 
            }
          }
        });

        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64) {
          const segmentPCM = this.decodeBase64ToPCM(base64);
          const startSample = Math.floor(Number(seg.start) * sampleRate);
          
          // Place segment audio in the master track
          for (let j = 0; j < segmentPCM.length; j++) {
            const targetIdx = startSample + j;
            if (targetIdx < finalPCM.length) {
              finalPCM[targetIdx] = segmentPCM[j];
            }
          }
          console.log(`Placed segment ${i+1} at offset ${seg.start}s (${segmentPCM.length} samples)`);
        }
      } catch (e) {
        console.error(`Segment ${i} synthesis failed:`, e);
      }
      
      // Essential delay for rate limiting in long transcriptions
      if (segments.length > 5) await new Promise(r => setTimeout(r, 200));
    }

    const wavBlob = this.addWavHeader(finalPCM, sampleRate);
    const audioUrl = URL.createObjectURL(wavBlob);

    return {
      audioUrl,
      duration: maxEnd,
      blob: wavBlob
    };
  }
}
