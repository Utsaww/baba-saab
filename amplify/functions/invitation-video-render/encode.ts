import { execFile } from "node:child_process";
import { promisify } from "node:util";

const FADE = 2;

/** Variable-rate screencast frames, each lasting until the next one arrives; the last one a single 30 fps frame. */
export function concatList(frames: { file: string; t: number }[]): string {
  return frames
    .map(({ file, t }, i) => `file '${file}'\nduration ${((frames[i + 1]?.t ?? t + 1 / 30) - t).toFixed(4)}`)
    .join("\n");
}

/** 1080×1920 H.264 at 30 fps; the music (looped, as on a guest's phone) fades out over the last 2 s. */
export function ffmpegArgs({ listFile, musicFile, seconds, out }: { listFile: string; musicFile?: string; seconds: number; out: string }): string[] {
  const music = musicFile
    ? { input: ["-stream_loop", "-1", "-i", musicFile], output: ["-map", "0:v", "-map", "1:a", "-af", `afade=t=out:st=${seconds - FADE}:d=${FADE}`, "-c:a", "aac", "-b:a", "192k"] }
    : { input: [], output: ["-an"] };
  return [
    "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", listFile,
    ...music.input,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    ...music.output,
    "-t", String(seconds),
    "-movflags", "+faststart",
    out,
  ];
}

export async function encode(ffmpeg: string, args: string[]) {
  await promisify(execFile)(ffmpeg, args, { maxBuffer: 16 * 1024 * 1024 });
}
