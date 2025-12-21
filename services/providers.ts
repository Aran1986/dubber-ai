
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { 
  ISpeechToTextProvider, 
  ITranslationProvider, 
  ITextToSpeechProvider, 
  ILipSyncProvider,
  TranscriptResult,
  TranslationResult,
  AudioResult,
  VideoResult
} from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY not found.");
  return new GoogleGenAI({ apiKey });
};

const createSilence = (durationSec: number, sampleRate: number): Uint8Array => {
    const numSamples = Math.floor(durationSec * sampleRate);
    return new Uint8Array(numSamples * 2); 
};

const concatenateBuffers = (buffers: Uint8Array[]): Uint8Array => {
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
};

const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const totalDataLen = pcmData.length;
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalDataLen + 36, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * numChannels * 16) / 8, true);
  view.setUint16(32, (numChannels * 16) / 8, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, totalDataLen, true);
  return new Blob([header, pcmData], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
};

const decodeBase64ToBytes = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
};

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 3 Flash (STT)";
  async transcribe(base64Data: string, mimeType: string): Promise<TranscriptResult> {
    const ai = getAIClient();
    const prompt = `Transcribe the audio accurately. Return JSON: { "language": "code", "fullText": "...", "segments": [{"start": sec, "end": sec, "text": "...", "speaker": "..."}] }`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: base64Data, mimeType: mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }
}

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 3 Flash (Translation)";
  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    const ai = getAIClient();
    const prompt = `Translate to ${targetLang}. Preserve JSON structure and timestamps exactly: ${JSON.stringify(transcript)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }
}

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";
  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    const ai = getAIClient();
    const voiceName = voiceId;
    const sampleRate = 24000;
    const audioBuffers: Uint8Array[] = [];
    let currentTimeCursor = 0;

    // Sequential generation to avoid rate limits and ensures all segments are processed
    for (const segment of translation.segments) {
        const gap = segment.start - currentTimeCursor;
        if (gap > 0.05) audioBuffers.push(createSilence(gap, sampleRate));
        
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: segment.text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                }
            });
            const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64) {
                const bytes = decodeBase64ToBytes(base64);
                audioBuffers.push(bytes);
                currentTimeCursor = segment.end; 
            }
        } catch (e) {
            console.error("TTS Segment failed", e);
        }
    }

    const finalPCM = concatenateBuffers(audioBuffers);
    const wavBlob = addWavHeader(finalPCM, sampleRate, 1);
    return { audioUrl: URL.createObjectURL(wavBlob), duration: currentTimeCursor, blob: wavBlob };
  }
}

export class MockWav2LipProvider implements ILipSyncProvider {
  name = "Wav2Lip (Mock)";
  async sync(videoFile: File, audioUrl: string): Promise<VideoResult> {
    return { videoUrl: URL.createObjectURL(videoFile) };
  }
}

export const ProviderRegistry = {
  getSTT(): ISpeechToTextProvider { return new GeminiSTTProvider(); },
  getTranslation(): ITranslationProvider { return new GeminiTranslationProvider(); },
  getTTS(): ITextToSpeechProvider { return new GeminiTTSProvider(); },
  getLipSync(): ILipSyncProvider { return new MockWav2LipProvider(); }
};
