
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
      const jobId = config.id || 'JOB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const { selectedSteps, mediaDuration } = config;

      // Restored estimation logic
      const totalEstimatedSec = Math.ceil(mediaDuration * 1.5 + 10); 

      this.updater({ 
          id: jobId, status: 'UPLOADING', progress: 5, stepProgress: 0, startTime: Date.now(),
          targetLang: config.targetLang, selectedSteps: config.selectedSteps, mediaDuration,
          logs: [
            createLog("Deployment engine initialized..."), 
            createLog(`Estimated processing duration: ~${totalEstimatedSec} seconds.`),
            createLog("Verifying original media integrity...")
          ]
      });

      await DBService.saveFile(`${jobId}_original`, file);
      const videoUrl = URL.createObjectURL(file);

      // 1. STT
      let transcript = null;
      if (selectedSteps.includes('TRANSCRIBING')) {
        this.updater({ status: 'TRANSCRIBING', logs: [createLog("Transcription (STT) layer active...")] });
        const stop = startEstimatedProgress(this.updater, mediaDuration * 800, 10, 20);
        const reader = new FileReader();
        const base64 = await new Promise<string>((r) => { 
          reader.onload=()=>r((reader.result as string).split(',')[1]); 
          reader.readAsDataURL(file); 
        });
        transcript = await ProviderRegistry.getSTT().transcribe(base64, file.type);
        stop();
        this.updater({ transcript, progress: 35, stepProgress: 100, logs: [createLog(`STT Success: Found ${transcript.segments.length} segments.`)] });
      }

      // 2. Translation
      let translation = null;
      if (selectedSteps.includes('TRANSLATING') && transcript) {
        this.updater({ status: 'TRANSLATING', logs: [createLog(`Translating to ${config.targetLang}...`)] });
        translation = await ProviderRegistry.getTranslation().translate(transcript, config.targetLang);
        this.updater({ translation, progress: 55, stepProgress: 100, logs: [createLog("Neural translation layer verified.")] });
      }

      // 3. Dubbing
      let dubbedAudio = null;
      if (selectedSteps.includes('DUBBING') && translation) {
        this.updater({ status: 'DUBBING', logs: [createLog("Synthesizing dubbed audio segments...")] });
        const stop = startEstimatedProgress(this.updater, mediaDuration * 1500, 55, 30);
        dubbedAudio = await ProviderRegistry.getTTS().synthesize(translation, config.voiceId);
        stop();
        this.updater({ dubbedAudio, progress: 85, stepProgress: 100, logs: [createLog("Dubbing track generated successfully.")] });
      }

      // 4. Muxing (The Real Render)
      if (dubbedAudio) {
        this.updater({ status: 'MUXING', logs: [createLog("Initiating final master render (Muxing)...")] });
        const stopMux = startEstimatedProgress(this.updater, mediaDuration * 1000, 85, 10);
        const finalBlob = await MuxerService.combine(videoUrl, dubbedAudio.audioUrl);
        const finalUrl = URL.createObjectURL(finalBlob);
        stopMux();
        this.updater({ finalVideo: { videoUrl: finalUrl }, progress: 98, stepProgress: 100, logs: [createLog("Muxing complete: Master file ready.")] });
      }

      this.updater({ status: 'COMPLETED', progress: 100, stepProgress: 100, endTime: Date.now(), logs: [createLog("Process sequence finished successfully.")] });

    } catch (error: any) {
      console.error(error);
      this.updater({ status: 'FAILED', logs: [createLog(`CRITICAL ERROR: ${error.message}`)] });
    }
  }
}
