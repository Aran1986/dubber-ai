import { JobState, JobStatus } from '../types';
import { ProviderRegistry } from './providers';

/**
 * PIPELINE ENGINE
 * This orchestrates the flow. It doesn't know about specific API implementations.
 * It strictly talks to the Interfaces via the Registry.
 */

type StateUpdater = (update: Partial<JobState>) => void;

// Helper to read file to Base64 with progress
const readFileWithProgress = (file: File, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                onProgress(percent);
            }
        };

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Remove Data URL prefix to get raw base64
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            } else {
                reject(new Error("Failed to read file"));
            }
        };

        reader.onerror = () => reject(new Error("File reading failed"));
        
        reader.readAsDataURL(file);
    });
};

export class VideoPipeline {
  private updater: StateUpdater;

  constructor(stateUpdater: StateUpdater) {
    this.updater = stateUpdater;
  }

  async run(file: File, config: { targetLang: string; voiceId: string; useLipSync: boolean }) {
    try {
      // Initialize Job
      this.updater({ 
          status: 'UPLOADING', 
          progress: 0, 
          stepProgress: 0,
          originalFile: file,
          startTime: Date.now(),
          endTime: null,
          logs: ["شروع پردازش...", `فایل انتخاب شد: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`]
      });

      // 1. Upload / Read File
      // We pass a callback to update UI during read
      const base64Data = await readFileWithProgress(file, (percent) => {
          this.updater({ 
              stepProgress: percent,
              // Map upload progress to 0-15% of total progress
              progress: (percent / 100) * 15 
          });
      });
      
      this.updater({ 
          fileBase64: base64Data, 
          stepProgress: 100, 
          progress: 15,
          logs: ["فایل با موفقیت بارگذاری شد."] 
      });

      await new Promise(r => setTimeout(r, 500)); // Transition delay

      // 2. Transcribe (STT)
      this.updater({ status: 'TRANSCRIBING', stepProgress: 0, logs: ["در حال تبدیل صدا به متن..."] });
      const sttProvider = ProviderRegistry.getSTT();
      
      let stepInterval = setInterval(() => {
          this.updater({ stepProgress: Math.min(90, Math.random() * 5 + 10) }); // Gentle fake progress
      }, 500);

      const transcript = await sttProvider.transcribe(base64Data, file.type);
      clearInterval(stepInterval);
      
      this.updater({ transcript, progress: 40, stepProgress: 100, logs: ["تبدیل متن انجام شد."] });

      // 3. Translate
      this.updater({ status: 'TRANSLATING', stepProgress: 0, logs: [`در حال ترجمه به ${config.targetLang}...`] });
      
      stepInterval = setInterval(() => {
          this.updater({ stepProgress: Math.min(90, Math.random() * 10 + 20) }); 
      }, 500);

      const transProvider = ProviderRegistry.getTranslation();
      const translation = await transProvider.translate(transcript, config.targetLang);
      clearInterval(stepInterval);

      this.updater({ translation, progress: 65, stepProgress: 100, logs: ["ترجمه کامل شد."] });

      // 4. Dub (TTS)
      this.updater({ status: 'DUBBING', stepProgress: 0, logs: ["در حال تولید صدای هوشمند..."] });
      
      stepInterval = setInterval(() => {
          this.updater({ stepProgress: Math.min(90, Math.random() * 10 + 30) }); 
      }, 500);

      const ttsProvider = ProviderRegistry.getTTS();
      const dubbedAudio = await ttsProvider.synthesize(translation, config.voiceId);
      clearInterval(stepInterval);

      this.updater({ dubbedAudio, progress: 85, stepProgress: 100, logs: ["صدا تولید شد."] });

      // 5. Lip Sync (Optional)
      let finalVideo = null;
      if (config.useLipSync) {
        this.updater({ status: 'LIPSYNCING', stepProgress: 0, logs: ["در حال هماهنگ‌سازی لب‌ها (Lip Sync)..."] });
        
        stepInterval = setInterval(() => {
             this.updater({ stepProgress: Math.min(95, Math.random() * 5 + 20) }); 
        }, 1500);

        const lipProvider = ProviderRegistry.getLipSync();
        finalVideo = await lipProvider.sync(file, dubbedAudio.audioUrl);
        clearInterval(stepInterval);
        
        this.updater({ stepProgress: 100 });
      } else {
        // Skip
        finalVideo = { videoUrl: URL.createObjectURL(file) }; 
      }

      // 6. Complete
      this.updater({ 
        status: 'COMPLETED', 
        progress: 100, 
        stepProgress: 100,
        finalVideo,
        endTime: Date.now(),
        logs: ["پایان پردازش! خروجی آماده است."]
      });

    } catch (error: any) {
      console.error(error);
      this.updater({ 
          status: 'FAILED', 
          // Keep progress where it was so user sees where it failed
          logs: [`خطا: ${error.message || "خطای ناشناخته رخ داده است."}`]
      });
    }
  }
}