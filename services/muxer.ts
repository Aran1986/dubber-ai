
export class MuxerService {
  /**
   * High-reliability Muxing: Combines video and audio by decoding audio into a buffer.
   * This bypasses the 'already connected' MediaElementSourceNode error.
   */
  static async combine(videoUrl: string, audioUrl: string): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const v = document.createElement('video');
        v.src = videoUrl;
        v.muted = true;
        v.crossOrigin = "anonymous";
        v.playsInline = true;

        // Fetch and decode audio to avoid MediaElementSource connection issues
        const audioResponse = await fetch(audioUrl);
        const audioData = await audioResponse.arrayBuffer();
        
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(audioData);
        
        const onReady = () => {
          if (v.readyState < 3) return;

          try {
            const vStream = (v as any).captureStream ? (v as any).captureStream() : (v as any).mozCaptureStream();
            const dest = ctx.createMediaStreamDestination();
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
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
            source.start(0);
            recorder.start();

            v.onended = () => {
              recorder.stop();
              source.stop();
            };
          } catch (err) {
            reject(err);
          }
        };

        v.oncanplaythrough = onReady;
        v.onerror = () => reject(new Error("Video failed to load for muxing"));
        
        // Safety timeout for video loading
        setTimeout(() => {
          if (v.readyState < 3) reject(new Error("Muxing video load timeout"));
        }, 15000);

      } catch (err) {
        reject(err);
      }
    });
  }
}
