
import { ILipSyncProvider, VideoResult } from '../types';

export class MockWav2LipProvider implements ILipSyncProvider {
  name = "Wav2Lip (Mock)";
  async sync(videoFile: File, audioUrl: string): Promise<VideoResult> {
    // Logic for Lip Syncing will go here.
    // For now, it returns the original video URL.
    return { videoUrl: URL.createObjectURL(videoFile) };
  }
}
