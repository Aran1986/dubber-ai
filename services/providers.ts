
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

// Helper to get Gemini Client lazily
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("خطای دسترسی: کلید API یافت نشد. لطفاً در تنظیمات ورسل متغیر API_KEY را ست کنید.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to create silence buffer
const createSilence = (durationSec: number, sampleRate: number): Uint8Array => {
    const numSamples = Math.floor(durationSec * sampleRate);
    const buffer = new Uint8Array(numSamples * 2); 
    return buffer;
};

// Helper to concatenate buffers
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

// Helper to add WAV header
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const totalDataLen = pcmData.length;
  const fileSize = totalDataLen + 36;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, totalDataLen, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const decodeBase64ToBytes = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// --- STT Providers ---

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 3 Flash (STT)";

  async transcribe(base64Data: string, mimeType: string, language: string = 'auto'): Promise<TranscriptResult> {
    console.log(`[${this.name}] Transcribing...`);
    const ai = getAIClient();
    const model = 'gemini-3-flash-preview';

    const prompt = `
      Precisely transcribe the audio in this file. 
      Split the transcription into segments representing individual sentences or logical phrases.
      For each segment, provide exact start and end timestamps in seconds.
      Identify different speakers if possible (e.g., "Speaker 1", "Speaker 2").
      
      Return the result strictly as a JSON object with this schema:
      {
        "language": "en" | "fa" | "es" etc,
        "fullText": "complete text",
        "segments": [
           { "start": number (seconds), "end": number (seconds), "text": "segment text", "speaker": "Speaker 1" }
        ]
      }
    `;

    try {
        const response = await ai.models.generateContent({
          model: model,
          contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType: mimeType } }, 
                { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    language: { type: Type.STRING },
                    fullText: { type: Type.STRING },
                    segments: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                start: { type: Type.NUMBER },
                                end: { type: Type.NUMBER },
                                text: { type: Type.STRING },
                                speaker: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
          }
        });

        if (!response.text) throw new Error("No response from Gemini.");
        return JSON.parse(response.text) as TranscriptResult;
    } catch (error: any) {
        throw error;
    }
  }
}

// --- Translation Providers ---

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 3 Flash (Translation)";

  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    console.log(`[${this.name}] Translating to ${targetLang}...`);
    const ai = getAIClient();

    const prompt = `
      Translate the following transcript JSON to ${targetLang}.
      CRITICAL: You MUST preserve the "start", "end", and "speaker" fields EXACTLY for every segment.
      Only translate the content within the "text" property.
      
      Input JSON:
      ${JSON.stringify(transcript)}
      
      Return valid JSON matching the structure above.
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    originalText: { type: Type.STRING },
                    translatedText: { type: Type.STRING },
                    targetLanguage: { type: Type.STRING },
                    segments: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                start: { type: Type.NUMBER },
                                end: { type: Type.NUMBER },
                                text: { type: Type.STRING },
                                speaker: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
          }
        });

        if (!response.text) throw new Error("No response from Gemini.");
        return JSON.parse(response.text) as TranslationResult;
    } catch (error: any) {
        throw new Error("Translation error: " + error.message);
    }
  }
}

// --- TTS Providers ---

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";

  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    console.log(`[${this.name}] Synthesizing Dubbed Track...`);
    const ai = getAIClient();
    const voiceName = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceId) ? voiceId : 'Puck';
    const sampleRate = 24000;

    const audioBuffers: Uint8Array[] = [];
    let currentTimeCursor = 0;

    for (const segment of translation.segments) {
        const gap = segment.start - currentTimeCursor;
        if (gap > 0) {
            audioBuffers.push(createSilence(gap, sampleRate));
            currentTimeCursor += gap;
        }

        try {
             const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: segment.text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName }
                        }
                    }
                }
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioBytes = decodeBase64ToBytes(base64Audio);
                audioBuffers.push(audioBytes);
                const duration = (audioBytes.length / 2) / sampleRate;
                currentTimeCursor += duration;
            }
        } catch (e) {
            console.warn(`Failed to synthesize segment`, e);
        }
    }

    if (audioBuffers.length === 0) throw new Error("No audio generated.");

    const finalPCM = concatenateBuffers(audioBuffers);
    const wavBlob = addWavHeader(finalPCM, sampleRate, 1);
    const url = URL.createObjectURL(wavBlob);

    return {
        audioUrl: url,
        duration: currentTimeCursor 
    };
  }
}

// --- LipSync Providers ---

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
