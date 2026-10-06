import { afterEach, describe, expect, it, vi } from "vitest";
import { mediaUrl, musicSrc, youtubeId } from "./media";

afterEach(() => vi.unstubAllEnvs());

describe("mediaUrl", () => {
  it("passes full URLs through", () => {
    expect(mediaUrl("https://images.unsplash.com/a.jpg")).toBe("https://images.unsplash.com/a.jpg");
  });
  it("prefixes keys with the media base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com/");
    expect(mediaUrl("/invitations/1/cover.jpg")).toBe("https://cdn.example.com/invitations/1/cover.jpg");
  });
  it("returns null for an empty key", () => {
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl("")).toBeNull();
  });
});

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abcdefghijk", "abcdefghijk"],
    ["https://youtube.com/watch?feature=share&v=abcdefghijk", "abcdefghijk"],
    ["https://youtu.be/abcdefghijk?t=3", "abcdefghijk"],
    ["https://www.youtube.com/embed/abcdefghijk", "abcdefghijk"],
    ["https://www.youtube.com/shorts/abcdefghijk", "abcdefghijk"],
  ])("extracts the id from %s", (url, id) => {
    expect(youtubeId(url)).toBe(id);
  });
  it("returns null for non-YouTube links", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId(undefined)).toBeNull();
  });
});

describe("musicSrc", () => {
  it("plays the stored key for library tracks and uploads", () => {
    expect(musicSrc({ type: "upload", key: "https://cdn.example.com/a.mp3" })).toBe("https://cdn.example.com/a.mp3");
    expect(musicSrc({ type: "library", trackId: "t1", key: "https://cdn.example.com/lib.mp3" })).toBe("https://cdn.example.com/lib.mp3");
    expect(musicSrc(undefined)).toBeNull();
  });
});
