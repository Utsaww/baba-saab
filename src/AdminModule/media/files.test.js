import { describe, expect, it } from "vitest";
import { fitWithin, isHeic, newKey, validateMusic, validatePhoto } from "./files";

const file = (name, type, size = 1000) => ({ name, type, size });

describe("validatePhoto", () => {
  it("accepts JPG, PNG, WebP and iPhone photos", () => {
    expect(validatePhoto(file("a.jpg", "image/jpeg"))).toBeNull();
    expect(validatePhoto(file("PXL_20261012.jpg", "image/jpeg"))).toBeNull();
    expect(validatePhoto(file("a.png", "image/png"))).toBeNull();
    expect(validatePhoto(file("a.webp", "image/webp"))).toBeNull();
    expect(validatePhoto(file("IMG_1.HEIC", ""))).toBeNull();
    expect(validatePhoto(file("IMG_2.heif", "image/heif"))).toBeNull();
  });

  it("explains what's wrong with anything else", () => {
    expect(validatePhoto(file("a.gif", "image/gif"))).toBe("Use a JPG, PNG, WebP or iPhone photo.");
    expect(validatePhoto(file("a.pdf", "application/pdf"))).toBe("Use a JPG, PNG, WebP or iPhone photo.");
    expect(validatePhoto(file("big.jpg", "image/jpeg", 26 * 1024 * 1024))).toBe("That photo is over 25 MB.");
    expect(validatePhoto(file("empty.jpg", "image/jpeg", 0))).toBe("That file is empty — choose another photo.");
  });
});

describe("validateMusic", () => {
  it("accepts MP3 under 10 MB only", () => {
    expect(validateMusic(file("song.mp3", "audio/mpeg"))).toBeNull();
    expect(validateMusic(file("song.MP3", ""))).toBeNull();
    expect(validateMusic(file("song.wav", "audio/wav"))).toBe("Choose an MP3 under 10 MB.");
    expect(validateMusic(file("long.mp3", "audio/mpeg", 11 * 1024 * 1024))).toBe("Choose an MP3 under 10 MB.");
    expect(validateMusic(file("empty.mp3", "audio/mpeg", 0))).toBe("That file is empty — choose another song.");
  });
});

describe("isHeic", () => {
  it("recognises iPhone photos by type or extension", () => {
    expect(isHeic(file("x.heic", ""))).toBe(true);
    expect(isHeic(file("x.jpg", "image/heic"))).toBe(true);
    expect(isHeic(file("x.jpg", "image/jpeg"))).toBe(false);
  });
});

describe("fitWithin", () => {
  it("shrinks the longest side to 2000 px and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1000, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("newKey", () => {
  it("makes a random file name inside the folder", () => {
    const a = newKey("invitations/inv-1/", "jpg");
    const b = newKey("invitations/inv-1/", "jpg");
    expect(a).toMatch(/^invitations\/inv-1\/[A-Za-z0-9]+\.jpg$/);
    expect(a).not.toBe(b);
  });
});
