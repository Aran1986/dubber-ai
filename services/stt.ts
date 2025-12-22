
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ISpeechToTextProvider, TranscriptResult } from '../types';

export class GeminiSTTProvider implements ISpeechToTextProvider {
  name = "Gemini 3 Flash (STT)";
  async transcribe(base64Data: string, mimeType: string): Promise<TranscriptResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `Return JSON only: { "language": "fa", "fullText": "Combined text here", "segments": [{"start": 0.0, "end": 2.5, "text": "Segment text"}] }. Transcribe exactly what is heard.`;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: base64Data, mimeType: mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }
}
