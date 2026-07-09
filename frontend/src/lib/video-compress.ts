import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export const MAX_VIDEO_DURATION_SECONDS = 210; // 3 minutos y medio

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "avi", "3gp"]);

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.has(ext);
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer el video"));
    };
    video.src = url;
  });
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
let progressCallback: ((ratio: number) => void) | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => {
        progressCallback?.(Math.min(1, Math.max(0, progress)));
      });
      await ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return ffmpegLoadPromise;
}

// Comprime a ~720p max, CRF 30 (calidad "decente" tipo WhatsApp). Si algo
// falla (equipo viejo, sin memoria, etc.) devuelve el archivo original en
// vez de bloquear la entrega del alumno.
export async function compressVideo(file: File, onProgress?: (ratio: number) => void): Promise<File> {
  try {
    const ffmpeg = await getFFmpeg();
    const inputName = `input-${Date.now()}.${file.name.split(".").pop() ?? "mp4"}`;
    const outputName = `output-${Date.now()}.mp4`;
    progressCallback = onProgress ?? null;

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec([
        "-i", inputName,
        "-vf", "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264",
        "-crf", "30",
        "-preset", "veryfast",
        "-c:a", "aac",
        "-b:a", "96k",
        "-movflags", "+faststart",
        outputName,
      ]);
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as unknown as BlobPart], { type: "video/mp4" });
      if (blob.size === 0 || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, ".mp4"), { type: "video/mp4" });
    } finally {
      progressCallback = null;
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  } catch {
    return file;
  }
}
