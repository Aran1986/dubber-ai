/**
 * DOMAIN LAYER
 * These interfaces define the contract. They must NOT change
 * regardless of whether we use an API or a Local Model.
 */

// --- User & Auth ---

export interface User {
  email: string;
  name: string;
  plan: 'free' | 'starter' | 'pro';
  credits: number;
  avatarUrl?: string;
  joinDate?: string;
}

// --- Data Models ---

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
  segments: Segment[]; // Translated segments aligned with timestamps
  targetLanguage: string;
}

export interface AudioResult {
  audioUrl: string; // Blob URL or Remote URL
  duration: number;
}

export interface VideoResult {
  videoUrl: string;
}

// --- History & Billing Models ---

export interface TokenUsage {
  service: 'STT' | 'TRANSLATION' | 'TTS' | 'LIPSYNC';
  cost: number;
  details: string; // e.g., "3.5 mins audio"
}

export interface JobRecord {
  id: string;
  fileName: string;
  date: string;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
  durationSec: number;
  totalCost: number;
  targetLang: string;
  tokenBreakdown: TokenUsage[];
  downloadUrl?: string;
}

// --- Service Interfaces (The Abstract Layer) ---

export interface ISpeechToTextProvider {
  name: string;
  // Transcribe now accepts base64 data string to separate file reading logic
  transcribe(base64Data: string, mimeType: string, language?: string): Promise<TranscriptResult>;
}

export interface ITranslationProvider {
  name: string;
  translate(transcript: TranscriptResult, targetLang: string): Promise<TranslationResult>;
}

export interface ITextToSpeechProvider {
  name: string;
  synthesize(translation: TranslationResult, voiceId?: string): Promise<AudioResult>;
}

export interface ILipSyncProvider {
  name: string;
  sync(videoFile: File, audioUrl: string): Promise<VideoResult>;
}

// --- Application Types ---

export type JobStatus = 'IDLE' | 'UPLOADING' | 'TRANSCRIBING' | 'TRANSLATING' | 'DUBBING' | 'LIPSYNCING' | 'COMPLETED' | 'FAILED';

export interface JobState {
  id: string;
  status: JobStatus;
  progress: number; // Global progress (0-100)
  stepProgress: number; // Current step progress (0-100) for the UI circles
  logs: string[];
  
  // Timing
  startTime: number | null;
  endTime: number | null;

  // Artifacts
  originalFile: File | null;
  fileBase64: string | null; // Cache base64 to avoid re-reading
  transcript: TranscriptResult | null;
  translation: TranslationResult | null;
  dubbedAudio: AudioResult | null;
  finalVideo: VideoResult | null;

  // Config
  targetLang: string;
  voiceId: string;
  useLipSync: boolean;
}