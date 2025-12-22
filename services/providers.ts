
import { 
  ISpeechToTextProvider, 
  ITranslationProvider, 
  ITextToSpeechProvider, 
  ILipSyncProvider 
} from '../types';
import { GeminiSTTProvider } from './stt';
import { GeminiTranslationProvider } from './translation';
import { GeminiTTSProvider } from './tts';
import { MockWav2LipProvider } from './lipsync';
import { GeminiEmotionProvider, IEmotionProvider } from './emotion';

export const ProviderRegistry = {
  getSTT(): ISpeechToTextProvider { return new GeminiSTTProvider(); },
  getTranslation(): ITranslationProvider { return new GeminiTranslationProvider(); },
  getTTS(): ITextToSpeechProvider { return new GeminiTTSProvider(); },
  getLipSync(): ILipSyncProvider { return new MockWav2LipProvider(); },
  getEmotion(): IEmotionProvider { return new GeminiEmotionProvider(); }
};
