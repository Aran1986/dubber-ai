
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ITranslationProvider, TranslationResult, TranscriptResult } from '../types';

export class GeminiTranslationProvider implements ITranslationProvider {
  name = "Gemini 3 Flash (Translation)";
  async translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `Translate this to ${targetLang}. Preserve JSON keys: start, end, text. Format: { "segments": [...] }. Input: ${JSON.stringify(transcript.segments)}`;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(response.text || "{}");
    return {
        originalText: transcript.fullText,
        translatedText: data.segments?.map((s: any) => s.text).join(' ') || "",
        segments: data.segments || [],
        targetLanguage: targetLang
    };
  }
}
