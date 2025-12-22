
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
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

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
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

/**
 * Robust Base64 to PCM Int16 conversion
 */
const decodeBase64ToPCM = (base64: string): Int16Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    // Create a new buffer to ensure alignment
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new Int16Array(buffer);
};

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 3 Flash (STT)";
  async transcribe(base64Data: string, mimeType: string): Promise<TranscriptResult> {
    const ai = getAIClient();
    const prompt = `Return JSON only: { "language": "fa", "fullText": "Combined text here", "segments": [{"start": 0.0, "end": 2.5, "text": "Segment text"}] }. Transcribe exactly what is heard.`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: base64Data, mimeType: mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "{}");
  }
}

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 3 Flash (Translation)";
  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    const ai = getAIClient();
    const prompt = `Translate this to ${targetLang}. Preserve JSON keys: start, end, text. Format: { "segments": [...] }. Input: ${JSON.stringify(transcript.segments)}`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    const data = JSON.parse(response.text || "{}");
    return {
        originalText: transcript.fullText,
        translatedText: data.segments?.map((s: any) => s.text).join(' ') || "",
        segments: data.segments || [],
        targetLanguage: targetLang
    };
  }
}

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";
  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    const ai = getAIClient();
    const sampleRate = 24000;
    
    const segments = translation.segments;
    if (!segments || segments.length === 0) throw new Error("No segments for TTS.");

    // Determine total length based on the last segment's end time
    const maxEnd = Math.max(...segments.map(s => Number(s.end)));
    const totalSamples = Math.ceil(maxEnd * sampleRate);
    const finalBuffer = new Int16Array(totalSamples);

    console.log(`Starting synthesis for ${segments.length} segments. Total duration: ${maxEnd}s`);

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg.text.trim()) continue;

        try {
            const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: seg.text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
                }
            }));

            const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64) {
                const pcm = decodeBase64ToPCM(base64);
                const startIdx = Math.floor(Number(seg.start) * sampleRate);
                
                // Overlay PCM data onto the final buffer at the correct timestamp
                for (let j = 0; j < pcm.length; j++) {
                    const targetIdx = startIdx + j;
                    if (targetIdx < finalBuffer.length) {
                        finalBuffer[targetIdx] = pcm[j];
                    }
                }
                console.log(`Segment ${i+1}/${segments.length} synced at ${seg.start}s`);
            }
        } catch (e) {
            console.error(`TTS Error on segment ${i}:`, e);
        }
        // Small delay to prevent API rate limits
        await new Promise(r => setTimeout(r, 150));
    }

    const wavBlob = addWavHeader(new Uint8Array(finalBuffer.buffer), sampleRate, 1);
    return { 
      audioUrl: URL.createObjectURL(wavBlob), 
      duration: maxEnd, 
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
