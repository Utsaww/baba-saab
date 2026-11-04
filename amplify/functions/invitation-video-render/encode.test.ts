import { describe, expect, it } from "vitest";
import { concatList, ffmpegArgs } from "./encode";

const after = (args: string[], flag: string) => args[args.indexOf(flag) + 1];

describe("ffmpegArgs", () => {
  it("video only", () => {
    const args = ffmpegArgs({ listFile: "/tmp/video/list.txt", seconds: 31.5, out: "/tmp/video/out.mp4" });
    expect(args.join(" ")).toContain("-f concat");
    expect(after(args, "-crf")).toBe("18");
    expect(after(args, "-preset")).toBe("medium");
    expect(after(args, "-pix_fmt")).toBe("yuv420p");
    expect(after(args, "-movflags")).toBe("+faststart");
    expect(args).toContain("-an");
    expect(after(args, "-t")).toBe("31.5");
    expect(args.at(-1)).toBe("/tmp/video/out.mp4");
  });
  it("with music loops and fades", () => {
    const seconds = 40;
    const args = ffmpegArgs({ listFile: "l.txt", musicFile: "/tmp/video/music", seconds, out: "o.mp4" });
    const music = args.indexOf("/tmp/video/music");
    expect(args.slice(music - 3, music)).toEqual(["-stream_loop", "-1", "-i"]);
    expect(after(args, "-c:a")).toBe("aac");
    expect(after(args, "-b:a")).toBe("192k");
    expect(args).toContain(`afade=t=out:st=${seconds - 2}:d=2`);
    expect(args).not.toContain("-an");
    expect(after(args, "-t")).toBe("40");
  });
});

describe("concatList", () => {
  it("gives each frame its real duration and the last one 1/30 s", () => {
    expect(concatList([{ file: "/tmp/video/00001.jpg", t: 0 }, { file: "/tmp/video/00002.jpg", t: 0.5 }])).toBe(
      "file '/tmp/video/00001.jpg'\nduration 0.5000\nfile '/tmp/video/00002.jpg'\nduration 0.0333",
    );
  });
});
