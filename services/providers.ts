
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
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

// Helper for retrying failed API calls (common in free tier)
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
    // Added GenerateContentResponse type to fix "Property 'text' does not exist on type 'unknown'"
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
    const prompt = `Translate to ${targetLang}. Preserve JSON structure and timestamps exactly: ${JSON.stringify(transcript)}`;
    // Added GenerateContentResponse type to fix "Property 'text' does not exist on type 'unknown'"
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "{}");
  }
}

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";
  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    const ai = getAIClient();
    const sampleRate = 24000;
    
    // 1. Calculate final buffer size based on the end of the last segment
    const lastSegment = translation.segments[translation.segments.length - 1];
    const totalDuration = lastSegment ? lastSegment.end : 0;
    const totalSamples = Math.ceil(totalDuration * sampleRate);
    
    // We use Int16Array for precise audio manipulation, then convert to Uint8 for WAV
    const finalBuffer = new Int16Array(totalSamples);

    for (let i = 0; i < translation.segments.length; i++) {
        const segment = translation.segments[i];
        
        try {
            console.debug(`Synthesizing segment ${i+1}/${translation.segments.length}: "${segment.text.substring(0, 20)}..."`);
            
            // Added GenerateContentResponse type to fix "Property 'candidates' does not exist on type 'unknown'"
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
                const bytes = decodeBase64ToBytes(base64);
                const segmentData = new Int16Array(bytes.buffer);
                
                // ABSOLUTE POSITIONING: Force the audio to start at the exact timestamp
                const startSample = Math.floor(segment.start * sampleRate);
                
                for (let j = 0; j < segmentData.length; j++) {
                    const targetIdx = startSample + j;
                    if (targetIdx < finalBuffer.length) {
                        // Blend or overwrite? Overwrite is usually cleaner for dubbing
                        finalBuffer[targetIdx] = segmentData[j];
                    }
                }
            }
            
            // Artificial stagger to avoid hitting RPM limits even with retries
            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error(`TTS Segment ${i} permanently failed after retries`, e);
        }
    }

    // Convert Int16 buffer back to Uint8 for WAV header compatibility
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
