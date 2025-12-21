
export class MuxerService {
  /**
   * Real Muxing: Combines video and audio into a single MP4 file in the browser.
   * This uses a hidden video element and MediaRecorder to capture the combined output.
   */
  static async combine(videoUrl: string, audioUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const audio = document.createElement('audio');
      video.src = videoUrl;
      audio.src = audioUrl;
      video.muted = true;
      video.crossOrigin = "anonymous";
      audio.crossOrigin = "anonymous";

      video.onloadedmetadata = () => {
        const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioCtx.destination);

        const combinedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ]);

        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/mp4' });
          resolve(blob);
        };

        video.play();
        audio.play();
        recorder.start();

        video.onended = () => {
          recorder.stop();
          audio.pause();
          audioCtx.close();
        };
      };

      video.onerror = reject;
      audio.onerror = reject;
    });
  }
}
