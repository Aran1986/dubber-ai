
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { 
  ISpeechToTextProvider, 
  ITranslationProvider, 
  ITextToSpeechProvider, 
  ILipSyncProvider,
  TranscriptResult,
  TranslationResult,
  AudioResult,
  VideoResult,
  Segment
} from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY not found.");
  return new GoogleGenAI({ apiKey });
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
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

const decodeBase64ToPCM = (base64: string): Int16Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    
    // Robust Int16 conversion avoiding buffer alignment issues
    const pcmSamples = new Int16Array(bytes.length / 2);
    const dv = new DataView(bytes.buffer);
    for (let i = 0; i < pcmSamples.length; i++) {
        pcmSamples[i] = dv.getInt16(i * 2, true); // Little-endian
    }
    return pcmSamples;
};

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 3 Flash (STT)";
  async transcribe(base64Data: string, mimeType: string): Promise<TranscriptResult> {
    const ai = getAIClient();
    const prompt = `Transcribe the audio accurately. Return JSON: { "language": "code", "fullText": "...", "segments": [{"start": sec, "end": sec, "text": "...", "speaker": "..."}] }`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: base64Data, mimeType: mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    }));
    const data = JSON.parse(response.text || "{}");
    // Ensure segments have numeric values
    if (data.segments) {
        data.segments = data.segments.map((s: any) => ({
            ...s,
            start: Number(s.start || 0),
            end: Number(s.end || 0)
        }));
    }
    return data;
  }
}

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 3 Flash (Translation)";
  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    const ai = getAIClient();
    const prompt = `Translate the segments to ${targetLang}. Return exactly the same JSON structure with "start", "end", and "text" keys. The input is: ${JSON.stringify(transcript)}`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    const data = JSON.parse(response.text || "{}");
    if (data.segments) {
        data.segments = data.segments.map((s: any) => ({
            ...s,
            start: Number(s.start || 0),
            end: Number(s.end || 0)
        }));
    }
    return data;
  }
}

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";
  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    const ai = getAIClient();
    const sampleRate = 24000;
    
    if (!translation.segments || translation.segments.length === 0) {
        throw new Error("Translation segments are empty. Cannot synthesize audio.");
    }

    const lastSegment = translation.segments[translation.segments.length - 1];
    const totalDuration = lastSegment ? Number(lastSegment.end) : 0;
    const totalSamples = Math.ceil(totalDuration * sampleRate);
    
    if (totalSamples <= 0) throw new Error("Computed audio duration is zero.");
    
    const finalBuffer = new Int16Array(totalSamples);

    for (let i = 0; i < translation.segments.length; i++) {
        const segment = translation.segments[i];
        if (!segment.text || segment.text.trim() === "") continue;
        
        try {
            const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: segment.text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
                }
            }));

            const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64) {
                const segmentPCM = decodeBase64ToPCM(base64);
                const startSample = Math.floor(Number(segment.start) * sampleRate);
                
                for (let j = 0; j < segmentPCM.length; j++) {
                    const targetIdx = startSample + j;
                    if (targetIdx < finalBuffer.length) {
                        finalBuffer[targetIdx] = segmentPCM[j];
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.error(`TTS Segment ${i} failed`, e);
        }
    }

    const finalUint8 = new Uint8Array(finalBuffer.buffer);
    const wavBlob = addWavHeader(finalUint8, sampleRate, 1);
    
    return { 
      audioUrl: URL.createObjectURL(wavBlob), 
      duration: totalDuration, 
      blob: wavBlob 
    };
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
