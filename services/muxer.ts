
export class MuxerService {
  /**
   * Real Muxing logic with proper AudioContext lifecycle management.
   * Fixes the 'already connected' error by using unique elements and cleanup.
   */
  static async combine(videoUrl: string, audioUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Create entirely new, detached elements for muxing
      const v = document.createElement('video');
      const a = document.createElement('audio');
      
      v.src = videoUrl;
      a.src = audioUrl;
      v.muted = true;
      v.crossOrigin = "anonymous";
      a.crossOrigin = "anonymous";

      const onReady = () => {
        if (v.readyState < 3 || a.readyState < 3) return;

        try {
          // Capture stream from video
          const vStream = (v as any).captureStream ? (v as any).captureStream() : (v as any).mozCaptureStream();
          
          // Create a fresh AudioContext for this specific muxing task
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = ctx.createMediaStreamDestination();
          
          // Connect the fresh audio element to the destination
          const source = ctx.createMediaElementSource(a);
          source.connect(dest);

          const combinedStream = new MediaStream([
            ...vStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ]);

          const recorder = new MediaRecorder(combinedStream, { 
            mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm' 
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => { if(e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            ctx.close();
            resolve(blob);
          };

          v.play();
          a.play();
          recorder.start();

          v.onended = () => {
            recorder.stop();
            a.pause();
          };
        } catch (err) {
          reject(err);
        }
      };

      v.oncanplaythrough = onReady;
      a.oncanplaythrough = onReady;
      v.onerror = () => reject(new Error("Video failed to load for muxing"));
      a.onerror = () => reject(new Error("Audio failed to load for muxing"));
    });
  }
}
