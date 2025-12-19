
import { JobState, JobStatus, LogEntry } from '../types';
import { ProviderRegistry } from './providers';
import { DBService } from './db';
import { AuthService } from './auth';

type StateUpdater = (update: Partial<JobState>) => void;

const createLog = (message: string): LogEntry => {
    return {
        message,
        time: new Date().toLocaleTimeString('fa-IR', { hour12: false })
    };
};

const readFileWithProgress = (file: File, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        let fakeProgress = 0;
        const totalFakeDuration = 1200; 
        const intervalTime = 50;
        const step = 100 / (totalFakeDuration / intervalTime);

        const progressInterval = setInterval(() => {
            fakeProgress = Math.min(99, fakeProgress + step);
            onProgress(fakeProgress);
        }, intervalTime);

        reader.onload = () => {
            clearInterval(progressInterval);
            onProgress(100);
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else reject(new Error("Failed to read file"));
        };
        reader.onerror = () => { clearInterval(progressInterval); reject(new Error("File reading failed")); };
        reader.readAsDataURL(file);
    });
};

const startEstimatedProgress = (updater: StateUpdater, estimatedDurationMs: number) => {
    let current = 0;
    const intervalTime = 200; 
    const targetPercent = 95; 
    const totalTicks = Math.max(1, estimatedDurationMs / intervalTime);
    const incrementPerTick = targetPercent / totalTicks;

    const interval = setInterval(() => {
        current += incrementPerTick;
        if (current > 99) current = 99;
        updater({ stepProgress: current });
    }, intervalTime);

    return () => clearInterval(interval);
};

export class VideoPipeline {
  private updater: StateUpdater;
  private currentJob: Partial<JobState> = {};

  constructor(stateUpdater: StateUpdater) {
    this.updater = (update) => {
        this.currentJob = { ...this.currentJob, ...update };
        stateUpdater(update);
        // Persist to DB asynchronously
        if (this.currentJob.id) {
            DBService.saveProject(this.currentJob as JobState).catch(console.error);
        }
    };
  }

  async run(file: File | Blob, config: { targetLang: string; voiceId: string; selectedSteps: string[]; mediaDuration: number; id?: string }) {
    try {
      const { selectedSteps, mediaDuration } = config;
      const durationSec = mediaDuration > 0 ? mediaDuration : 30;
      const jobId = config.id || 'JOB-' + Date.now();

      // 0. INITIALIZE
      this.updater({ 
          id: jobId,
          status: 'UPLOADING', progress: 0, stepProgress: 0, startTime: Date.now(),
          targetLang: config.targetLang,
          selectedSteps: config.selectedSteps,
          mediaDuration: durationSec,
          logs: [
              createLog("شروع پردازش سیستمی..."), 
              createLog(`فایل شناسایی شد.`), 
              createLog(`تخمین کل زمان پردازش: ~${Math.round(durationSec * 1.8)} ثانیه`) 
          ]
      });

      // Save initial file to DB
      await DBService.saveFile(`${jobId}_original`, file);

      // 1. READ / UPLOAD
      let base64Data = '';
      if (file instanceof File) {
          base64Data = await readFileWithProgress(file, (percent) => {
              this.updater({ stepProgress: percent, progress: (percent / 100) * 10 });
          });
      } else {
          // If it's a blob from DB, we need to convert to base64 for Gemini
          const reader = new FileReader();
          base64Data = await new Promise((res) => {
              reader.onload = () => res((reader.result as string).split(',')[1]);
              reader.readAsDataURL(file);
          });
          this.updater({ progress: 10, stepProgress: 100 });
      }
      
      this.updater({ fileBase64: base64Data, stepProgress: 100, progress: 10, logs: [createLog("فایل در بافر عملیاتی آماده شد.")] });

      // 2. TRANSCRIBE (STT)
      let transcript = null;
      if (selectedSteps.includes('TRANSCRIBING')) {
        this.updater({ status: 'TRANSCRIBING', stepProgress: 0, logs: [createLog("در حال تبدیل گفتار به متن (STT)...")] });
        const estimatedTime = Math.max(5000, (durationSec * 1000) * 0.5);
        const stopProgress = startEstimatedProgress(this.updater, estimatedTime);
        transcript = await ProviderRegistry.getSTT().transcribe(base64Data, 'video/mp4'); // Defaulting mime
        stopProgress(); 
        this.updater({ transcript, progress: 30, stepProgress: 100, logs: [createLog("تبدیل متن با موفقیت انجام شد.")] });
      }

      // 3. TRANSLATE
      let translation = null;
      if (selectedSteps.includes('TRANSLATING') && transcript) {
        this.updater({ status: 'TRANSLATING', stepProgress: 0, logs: [createLog(`در حال ترجمه به زبان ${config.targetLang}...`)] });
        const estimatedTime = 3000 + (durationSec * 200);
        const stopProgress = startEstimatedProgress(this.updater, estimatedTime);
        translation = await ProviderRegistry.getTranslation().translate(transcript, config.targetLang);
        stopProgress();
        this.updater({ translation, progress: 50, stepProgress: 100, logs: [createLog("ترجمه محتوا تکمیل شد.")] });
      }

      // 4. DUBBING (TTS)
      let dubbedAudio = null;
      if (selectedSteps.includes('DUBBING') && translation) {
        this.updater({ status: 'DUBBING', stepProgress: 0, logs: [createLog(`در حال سنتز صدای هوشمند...`)] });
        const estimatedTime = Math.max(8000, (durationSec * 1000) * 1.2);
        const stopProgress = startEstimatedProgress(this.updater, estimatedTime);
        dubbedAudio = await ProviderRegistry.getTTS().synthesize(translation, config.voiceId);
        stopProgress();
        this.updater({ dubbedAudio, progress: 75, stepProgress: 100, logs: [createLog("صدای دوبله با موفقیت تولید شد.")] });
      }

      // 5. LIP SYNC
      if (selectedSteps.includes('LIPSYNCING') && dubbedAudio) {
        this.updater({ status: 'LIPSYNCING', stepProgress: 0, logs: [createLog("در حال هماهنگ‌سازی لب‌ها (Sync)...")] });
        const estimatedTime = 4000; 
        const stopProgress = startEstimatedProgress(this.updater, estimatedTime);
        await ProviderRegistry.getLipSync().sync(file as any, dubbedAudio.audioUrl);
        stopProgress();
        this.updater({ progress: 95, stepProgress: 100, logs: [createLog("هماهنگ‌سازی لب‌ها پایان یافت.")] });
      }

      // 6. COMPLETE
      // Logic for credit deduction (approx 1 credit per second of dubbing)
      const cost = Math.ceil(durationSec);
      const success = await AuthService.deductCredits(cost);
      
      this.updater({ 
        status: 'COMPLETED', progress: 100, stepProgress: 100, endTime: Date.now(),
        finalVideo: { videoUrl: URL.createObjectURL(file) },
        logs: [
            createLog("عملیات با موفقیت پایان یافت. خروجی آماده نمایش است."),
            createLog(success ? `مقدار ${cost} اعتبار از حساب شما کسر شد.` : "خطا در کسر اعتبار (موجودی منفی)")
        ]
      });

    } catch (error: any) {
      console.error(error);
      this.updater({ status: 'FAILED', logs: [createLog(`خطا در پردازش: ${error.message}`)] });
    }
  }
}
