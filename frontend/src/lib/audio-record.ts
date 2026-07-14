export function isAudioRecordingSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

// Envuelve MediaRecorder para grabar audio del microfono y devolverlo como
// File listo para agregarse al mismo flujo de subida que videos/documentos.
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  pause(): void {
    if (this.recorder && this.recorder.state === "recording") this.recorder.pause();
  }

  resume(): void {
    if (this.recorder && this.recorder.state === "paused") this.recorder.resume();
  }

  stop(): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error("No hay grabación en curso"));
        return;
      }
      this.recorder.onstop = () => {
        const type = this.recorder?.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type });
        this.releaseStream();
        const ext = type.includes("ogg") ? "ogg" : "webm";
        resolve(new File([blob], `audio-forum-${Date.now()}.${ext}`, { type }));
      };
      this.recorder.stop();
    });
  }

  cancel(): void {
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.releaseStream();
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
