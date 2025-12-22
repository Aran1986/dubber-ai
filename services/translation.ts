
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ITranslationProvider, TranslationResult, TranscriptResult } from '../types';

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 3 Flash (Translation)";
  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    // We send segments individually or in a structured way to ensure mapping isn't lost
    const prompt = `Translate the following speech segments to ${targetLang}. 
Keep the EXACT same 'start' and 'end' timestamps. 
Output JSON format: { "segments": [{"start": float, "end": float, "text": "translated text"}] }
Input: ${JSON.stringify(transcript.segments)}`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(response.text || "{}");
    const translatedSegments = data.segments || [];

    return {
        originalText: transcript.fullText,
        translatedText: translatedSegments.map((s: any) => s.text).join(' '),
        segments: translatedSegments,
        targetLanguage: targetLang
    };
  }
}
