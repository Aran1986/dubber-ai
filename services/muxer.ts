
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export class MuxerService {
  private static ffmpeg: FFmpeg | null = null;

  /**
   * Initializes and loads FFmpeg.wasm.
   * This is much more reliable than MediaRecorder as it performs actual container muxing.
   */
  static async load() {
    if (this.ffmpeg) return this.ffmpeg;
    
    this.ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    return this.ffmpeg;
  }

  /**
   * Combines a video file and an audio file into a single MP4 using FFmpeg.
   * Logic: Copy video stream (no re-encode, fast) + Re-encode audio to AAC (standard for MP4).
   */
  static async combine(videoUrl: string, audioUrl: string): Promise<Blob> {
    const ffmpeg = await this.load();

    try {
      // Write files to virtual filesystem
      await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoUrl));
      await ffmpeg.writeFile('input_audio.wav', await fetchFile(audioUrl));

      // Execute FFmpeg command:
      // -i: inputs
      // -c:v copy: Just copy video frames without re-encoding (extremely fast & high quality)
      // -c:a aac: Re-encode audio to AAC format for maximum MP4 compatibility
      // -map: explicitly map first video and first audio stream
      // -shortest: stop when the shortest stream ends
      await ffmpeg.exec([
        '-i', 'input_video.mp4',
        '-i', 'input_audio.wav',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        'output.mp4'
      ]);

      // Read resulting file
      const data = await ffmpeg.readFile('output.mp4');
      
      // Cleanup virtual filesystem
      await ffmpeg.deleteFile('input_video.mp4');
      await ffmpeg.deleteFile('input_audio.wav');
      await ffmpeg.deleteFile('output.mp4');

      return new Blob([(data as any).buffer], { type: 'video/mp4' });
    } catch (err) {
      console.error("FFmpeg Muxing failed:", err);
      throw new Error("FFmpeg engine failed to mux media. Check console for details.");
    }
  }
}
