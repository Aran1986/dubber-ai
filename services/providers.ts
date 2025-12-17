import { GoogleGenAI, Type } from "@google/genai";
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

// Initialize Gemini Client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// Helper to check API Key
const checkApiKey = () => {
  if (!apiKey) {
    throw new Error("خطای دسترسی: کلید API یافت نشد. لطفاً فایل env. خود را بررسی کنید.");
  }
};

// Helper to create silence buffer
const createSilence = (durationSec: number, sampleRate: number): Uint8Array => {
    const numSamples = Math.floor(durationSec * sampleRate);
    // 16-bit PCM = 2 bytes per sample
    const buffer = new Uint8Array(numSamples * 2); 
    // Default is 0 (silence)
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

// Helper to add WAV header to Raw PCM data
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const totalDataLen = pcmData.length;
  const fileSize = totalDataLen + 36;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, totalDataLen, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Decode Base64 to Uint8Array
const decodeBase64ToBytes = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// ============================================================================
// REAL PROVIDERS (Gemini Powered)
// ============================================================================

// --- STT Providers ---

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 2.5 Flash (Audio)";

  async transcribe(base64Data: string, mimeType: string, language: string = 'auto'): Promise<TranscriptResult> {
    console.log(`[${this.name}] Transcribing...`);
    checkApiKey();

    const model = 'gemini-2.5-flash';

    const prompt = `
      Transcribe the audio in this file accurately.
      Identify the main language.
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

        if (!response.text) throw new Error("پاسخی از هوش مصنوعی دریافت نشد.");
        
        const result = JSON.parse(response.text);
        return result as TranscriptResult;
    } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('403')) {
            throw new Error("خطای احراز هویت: کلید API نامعتبر است.");
        }
        if (error.message?.includes('413')) {
             throw new Error("خطای حجم فایل: فایل ارسالی برای پردازش مستقیم بسیار حجیم است.");
        }
        throw error;
    }
  }
}

// --- Translation Providers ---

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 2.5 Flash (Translation)";

  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    console.log(`[${this.name}] Translating to ${targetLang}...`);
    checkApiKey();

    const prompt = `
      Translate the following transcript JSON to ${targetLang}.
      Maintain the "start", "end", and "speaker" fields exactly as they are.
      Only translate the "text" fields.
      Also provide the full translated text.
      
      Input JSON:
      ${JSON.stringify(transcript)}
      
      Return JSON format matching the input structure but with translated content.
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
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

        if (!response.text) throw new Error("پاسخی از هوش مصنوعی دریافت نشد.");
        return JSON.parse(response.text) as TranslationResult;
    } catch (error: any) {
        throw new Error("خطا در سرویس ترجمه: " + error.message);
    }
  }
}

// --- TTS Providers ---

export class GeminiTTSProvider implements ITextToSpeechProvider {
  name = "Gemini 2.5 Flash TTS";

  async synthesize(translation: TranslationResult, voiceId: string = 'Puck'): Promise<AudioResult> {
    console.log(`[${this.name}] Synthesizing with Sync...`);
    checkApiKey();

    const voiceName = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceId) ? voiceId : 'Puck';
    const sampleRate = 24000; // Gemini default

    const audioBuffers: Uint8Array[] = [];
    let currentTimeCursor = 0;

    // Iterate through segments to maintain timing
    for (const segment of translation.segments) {
        // 1. Calculate Silence needed before this segment
        const gap = segment.start - currentTimeCursor;
        if (gap > 0) {
            console.log(`Adding silence: ${gap.toFixed(2)}s`);
            audioBuffers.push(createSilence(gap, sampleRate));
            currentTimeCursor += gap;
        }

        // 2. Generate Audio for Segment
        try {
             // Add a tiny delay to avoid rate limits
             await new Promise(r => setTimeout(r, 100));

             const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: {
                    parts: [{ text: segment.text }]
                },
                config: {
                    responseModalities: ["AUDIO"],
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
                
                // Update cursor based on generated audio length
                // 2 bytes per sample (16-bit)
                const duration = (audioBytes.length / 2) / sampleRate;
                currentTimeCursor += duration;
            }

        } catch (e) {
            console.warn(`Failed to synthesize segment: ${segment.text}`, e);
            // If failed, just treat it as silence time
        }
    }

    if (audioBuffers.length === 0) throw new Error("داده صوتی تولید نشد.");

    // Stitch all buffers
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
    console.log(`[${this.name}] Syncing lips...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      videoUrl: URL.createObjectURL(videoFile)
    };
  }
}

// ============================================================================
// 2. PROVIDER REGISTRY
// ============================================================================

export const ProviderRegistry = {
  getSTT(): ISpeechToTextProvider {
    return new GeminiSTTProvider();
  },

  getTranslation(): ITranslationProvider {
    return new GeminiTranslationProvider();
  },

  getTTS(): ITextToSpeechProvider {
    return new GeminiTTSProvider();
  },

  getLipSync(): ILipSyncProvider {
    return new MockWav2LipProvider();
  }
};