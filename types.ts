
/**
 * DOMAIN LAYER - DubberAI Types
 */

export type VoiceCategory = 'Celebrity' | 'Professional' | 'Generic' | 'MyVoices' | 'Free';
export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface User {
  email: string;
  name: string;
  plan: PlanTier;
  credits: number;
  avatarUrl?: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  tier: PlanTier;
}

export interface VoiceRating {
  score: number; 
  count: number;
}

export interface Voice {
  id: string;
  name: string;
  category: VoiceCategory;
  isFree: boolean;
  price?: number;
  ownerId?: string;
  isForSale?: boolean;
  previewUrl?: string;
  languageRatings: Record<string, VoiceRating>;
  supportedLanguages: string[];
}

export interface LogEntry {
  message: string;
  time: string;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TranscriptResult {
  fullText: string;
  segments: Segment[];
  language: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  segments: Segment[];
  targetLanguage: string;
}

export interface AudioResult {
  audioUrl: string;
  duration: number;
}

export interface VideoResult {
  videoUrl: string;
}

/**
 * Service Provider Interfaces
 */

// Interface for Speech-to-Text providers
export interface ISpeechToTextProvider {
  name: string;
  transcribe(base64Data: string, mimeType: string, language?: string): Promise<TranscriptResult>;
}

// Interface for Translation providers
export interface ITranslationProvider {
  name: string;
  translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult>;
}

// Interface for Text-to-Speech providers
export interface ITextToSpeechProvider {
  name: string;
  synthesize(translation: TranslationResult, voiceId?: string): Promise<AudioResult>;
}

// Interface for LipSync providers
export interface ILipSyncProvider {
  name: string;
  sync(videoFile: File, audioUrl: string): Promise<VideoResult>;
}

export type JobStatus = 'IDLE' | 'UPLOADING' | 'TRANSCRIBING' | 'TRANSLATING' | 'DUBBING' | 'LIPSYNCING' | 'COMPLETED' | 'FAILED';

export interface JobState {
  id: string;
  status: JobStatus;
  progress: number;
  stepProgress: number;
  logs: LogEntry[];
  startTime: number | null;
  endTime: number | null;
  originalFile: File | null;
  mediaDuration: number;
  fileBase64: string | null;
  transcript: TranscriptResult | null;
  translation: TranslationResult | null;
  dubbedAudio: AudioResult | null;
  finalVideo: VideoResult | null;
  targetLang: string;
  selectedVoice: Voice | null;
  selectedSteps: string[];
}

export interface TokenBreakdown {
  service: string;
  cost: number;
  details: string;
}

export interface JobRecord {
  id: string;
  fileName: string;
  date: string;
  status: string;
  durationSec: number;
  totalCost: number;
  targetLang: string;
  downloadUrl?: string;
  tokenBreakdown: TokenBreakdown[];
}
