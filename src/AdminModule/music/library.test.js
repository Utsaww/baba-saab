import { describe, expect, it } from "vitest";
import { formatDuration, isLibraryKey, trackNameFromFile, usageByTrack, usedByMessage, validateTrackName } from "./library";

describe("usageByTrack", () => {
  it("groups invitations by the library track they use", () => {
    const rows = [
      { coupleNames: "Priya & Rahul", musicTrackId: "t1" },
      { coupleNames: "Neha & Arjun", musicTrackId: "t1" },
      { coupleNames: "Aarohi & Vihaan", musicTrackId: null },
      { coupleNames: "Isha & Kabir", musicTrackId: "t2" },
    ];
    expect(usageByTrack(rows)).toEqual({ t1: ["Priya & Rahul", "Neha & Arjun"], t2: ["Isha & Kabir"] });
  });
});

describe("trackNameFromFile", () => {
  it("turns a file name into a readable default name", () => {
    expect(trackNameFromFile("Shehnai_Wedding-Entry.mp3")).toBe("Shehnai Wedding Entry");
    expect(trackNameFromFile("")).toBe("");
  });
});

describe("formatDuration", () => {
  it("shows minutes and seconds", () => {
    expect(formatDuration(195.4)).toBe("3:15");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(undefined)).toBe("");
  });
});

describe("validateTrackName", () => {
  it("requires a name under 80 characters", () => {
    expect(validateTrackName("  Shehnai ")).toBeNull();
    expect(validateTrackName("   ")).toBe("Enter a name for the song.");
    expect(validateTrackName("x".repeat(81))).toBe("Keep the name under 80 characters.");
  });
});

describe("usedByMessage", () => {
  it("explains why a track can't be deleted", () => {
    expect(usedByMessage(1)).toBe("Used by 1 invitation — change its music first.");
    expect(usedByMessage(3)).toBe("Used by 3 invitations — change their music first.");
  });
});

describe("isLibraryKey", () => {
  it("accepts only MP3 files in the library folder", () => {
    expect(isLibraryKey("music-library/3f9a.mp3")).toBe(true);
    expect(isLibraryKey("invitations/i/3f9a.mp3")).toBe(false);
    expect(isLibraryKey("music-library/../x.mp3")).toBe(false);
    expect(isLibraryKey("music-library/a.wav")).toBe(false);
  });
});
