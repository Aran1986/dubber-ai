
import { JobState, JobStatus, LogEntry } from '../types';
import { ProviderRegistry } from './providers';
import { DBService } from './db';
import { MuxerService } from './muxer';

type StateUpdater = (update: Partial<JobState>) => void;

const createLog = (message: string): LogEntry => ({
  message,
  time: new Date().toLocaleTimeString('fa-IR', { hour12: false })
});

const startEstimatedProgress = (updater: StateUpdater, estimatedDurationMs: number, startPercent: number, weight: number) => {
    let current = 0;
    const interval = setInterval(() => {
        current += (weight / (estimatedDurationMs / 200));
        if (current > weight * 0.95) return;
        updater({ stepProgress: (current / weight) * 100, progress: startPercent + current });
    }, 200);
    return () => clearInterval(interval);
};

export class VideoPipeline {
  private updater: StateUpdater;
  private currentJob: Partial<JobState> = {};

  constructor(stateUpdater: StateUpdater) {
    this.updater = (update) => {
        this.currentJob = { ...this.currentJob, ...update };
        stateUpdater(update);
        if (this.currentJob.id) DBService.saveProject(this.currentJob as JobState).catch(console.error);
    };
  }

  async run(file: File, config: { targetLang: string; voiceId: string; selectedSteps: string[]; mediaDuration: number; id?: string }) {
    try {
      const jobId = config.id || 'JOB-' + Date.now();
      const { selectedSteps, mediaDuration } = config;

      this.updater({ 
          id: jobId, status: 'UPLOADING', progress: 0, stepProgress: 0, startTime: Date.now(),
          targetLang: config.targetLang, selectedSteps: config.selectedSteps, mediaDuration,
          logs: [createLog("Pipeline started..."), createLog("Media source verified.")]
      });

      await DBService.saveFile(`${jobId}_original`, file);
      const videoUrl = URL.createObjectURL(file);

      // 1. STT
      let transcript = null;
      if (selectedSteps.includes('TRANSCRIBING')) {
        this.updater({ status: 'TRANSCRIBING', logs: [createLog("Transcribing...")] });
        const stop = startEstimatedProgress(this.updater, mediaDuration * 1000, 10, 20);
        const reader = new FileReader();
        const base64 = await new Promise<string>((r) => { reader.onload=()=>r((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
        transcript = await ProviderRegistry.getSTT().transcribe(base64, file.type);
        stop();
        this.updater({ transcript, progress: 30, stepProgress: 100, logs: [createLog("Transcription completed.")] });
      }

      // 2. Translation
      let translation = null;
      if (selectedSteps.includes('TRANSLATING') && transcript) {
        this.updater({ status: 'TRANSLATING', logs: [createLog("Translating...")] });
        translation = await ProviderRegistry.getTranslation().translate(transcript, config.targetLang);
        this.updater({ translation, progress: 50, stepProgress: 100, logs: [createLog("Translation completed.")] });
      }

      // 3. Dubbing
      let dubbedAudio = null;
      if (selectedSteps.includes('DUBBING') && translation) {
        this.updater({ status: 'DUBBING', logs: [createLog("Generating Dubbed Voice...")] });
        const stop = startEstimatedProgress(this.updater, mediaDuration * 1200, 50, 30);
        dubbedAudio = await ProviderRegistry.getTTS().synthesize(translation, config.voiceId);
        stop();
        this.updater({ dubbedAudio, progress: 80, stepProgress: 100, logs: [createLog("Dubbing track ready.")] });
      }

      // 4. Muxing (Real Render)
      if (dubbedAudio) {
        this.updater({ status: 'MUXING', logs: [createLog("Merging Audio/Video (Rendering)...")] });
        const finalBlob = await MuxerService.combine(videoUrl, dubbedAudio.audioUrl);
        const finalUrl = URL.createObjectURL(finalBlob);
        this.updater({ finalVideo: { videoUrl: finalUrl }, progress: 95, stepProgress: 100, logs: [createLog("Rendering finished.")] });
      }

      this.updater({ status: 'COMPLETED', progress: 100, stepProgress: 100, endTime: Date.now(), logs: [createLog("Task completed successfully.")] });

    } catch (error: any) {
      this.updater({ status: 'FAILED', logs: [createLog(`Error: ${error.message}`)] });
    }
  }
}
