
export class MuxerService {
  /**
   * Real Muxing: Combines video and audio into a single MP4 file in the browser.
   * Ensures the recorder waits for audio and video to be fully ready.
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
      video.playsInline = true;

      const setupMuxing = () => {
        // Ensure both elements are ready
        if (video.readyState < 3 || audio.readyState < 3) return;

        try {
          // Use captureStream on video element
          const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream();
          
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
          const source = audioCtx.createMediaElementSource(audio);
          const destination = audioCtx.createMediaStreamDestination();
          
          source.connect(destination);
          // Optional: source.connect(audioCtx.destination); if you want to hear it during render

          const combinedStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
          ]);

          // We use webm as an intermediary if needed, but labeling as mp4 for download consistency 
          // Browser support varies, but 'video/webm;codecs=vp9,opus' is generally stable
          const recorder = new MediaRecorder(combinedStream, { 
            mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
          });
          
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            resolve(blob);
          };

          // Start both
          video.play();
          audio.play();
          recorder.start();

          video.onended = () => {
            recorder.stop();
            audio.pause();
            audioCtx.close().catch(() => {});
          };
          
          video.onerror = (e) => {
             recorder.stop();
             reject(new Error("Video playback error during muxing"));
          };
        } catch (err) {
          reject(err);
        }
      };

      video.addEventListener('canplaythrough', setupMuxing);
      audio.addEventListener('canplaythrough', setupMuxing);
      
      // Safety timeout
      setTimeout(() => {
        if (video.readyState < 3) reject(new Error("Muxing timed out waiting for media"));
      }, 30000);
    });
  }
}
