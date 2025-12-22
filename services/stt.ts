
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ISpeechToTextProvider, TranscriptResult } from '../types';

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 3 Flash (STT)";
  async transcribe(base64Data: string, mimeType: string): Promise<TranscriptResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `Task: Transcribe this audio with PRECISE timestamps.
Format: JSON only.
Structure: { "language": "fa", "fullText": "...", "segments": [{"start": float, "end": float, "text": "string"}] }
Rules:
1. Divide the transcription into small segments (max 5 seconds each).
2. The "start" and "end" must be precise seconds (e.g., 1.25).
3. Ensure every word is captured in a segment.
4. Language is Persian/Farsi.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } }, 
          { text: prompt }
        ] 
      },
      config: { 
        responseMimeType: "application/json",
        temperature: 0.1 // Lower temperature for more consistent JSON/Timestamps
      }
    });

    const result = JSON.parse(response.text || "{}");
    if (!result.segments || result.segments.length === 0) {
        throw new Error("STT failed to generate timed segments.");
    }
    return result;
  }
}
