
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ITextToSpeechProvider, AudioResult, TranslationResult } from '../types';

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";

  private decodeBase64ToPCM(base64: string): Int16Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const sampleCount = Math.floor(len / 2);
    const pcm = new Int16Array(sampleCount);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < sampleCount; i++) {
      pcm[i] = view.getInt16(i * 2, true); // Little-endian PCM 16-bit
    }
    return pcm;
  }

  private addWavHeader(pcmData: Uint8Array, sampleRate: number): Blob {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const totalDataLen = pcmData.length;
    const writeString = (v: DataView, o: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalDataLen + 36, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
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
    
    if (!segments || segments.length === 0) throw new Error("No segments to synthesize.");

    const maxDuration = Math.max(...segments.map(s => Number(s.end)));
    const totalSamples = Math.ceil(maxDuration * sampleRate);
    const finalPCM = new Int16Array(totalSamples);

    console.log(`Starting synthesis for ${segments.length} segments.`);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg.text.trim()) continue;

      try {
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: seg.text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
          }
        });

        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64) {
          const segmentPCM = this.decodeBase64ToPCM(base64);
          const startSample = Math.floor(Number(seg.start) * sampleRate);
          
          // Place segment audio precisely in the master buffer
          for (let j = 0; j < segmentPCM.length; j++) {
            const targetIdx = startSample + j;
            if (targetIdx < finalPCM.length) {
              finalPCM[targetIdx] = segmentPCM[j];
            }
          }
          console.log(`Segment ${i+1}/${segments.length} placed at ${seg.start}s`);
        }
      } catch (e) {
        console.error(`TTS Synthesis Error on segment ${i}:`, e);
      }
      await new Promise(r => setTimeout(r, 250)); // Rate limit protection
    }

    const wavBlob = this.addWavHeader(new Uint8Array(finalPCM.buffer), sampleRate);
    return {
      audioUrl: URL.createObjectURL(wavBlob),
      duration: maxDuration,
      blob: wavBlob
    };
  }
}
