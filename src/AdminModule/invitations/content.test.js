import { describe, expect, it } from "vitest";
import { FOREIGN_FILE, MISSING_TRACK, parseContent, prepareSave, SAVE_FAILED, saveResult } from "./content";

const content = {
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: " Priya " } } },
};

describe("parseContent", () => {
  it("accepts a JSON string or an object", () => {
    expect(parseContent('{"a":1}')).toEqual({ a: 1 });
    expect(parseContent({ a: 1 })).toEqual({ a: 1 });
    expect(parseContent(null)).toEqual({});
    expect(parseContent("not json")).toEqual({});
  });
});

describe("prepareSave", () => {
  it("cleans the draft and derives the index fields", () => {
    const result = prepareSave({ id: "inv-1", expectedVersion: 2, content });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.content).couple.bride.name.en).toBe("Priya");
    expect(result.fields).toEqual({ templateId: "royal", mainDate: null, coupleNames: "Priya", searchText: "priya", musicTrackId: null });
  });

  it("rejects a malformed request", () => {
    expect(prepareSave({ id: 5, expectedVersion: 2, content })).toEqual({
      ok: false,
      message: "That save request wasn't valid. Reload the page.",
    });
    expect(prepareSave({ id: "inv-1", expectedVersion: "2", content }).ok).toBe(false);
  });

  it("refuses to save without a template and palette", () => {
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content: { language: "en" } })).toEqual({
      ok: false,
      message: "Choose a template and palette before saving.",
    });
  });
});

describe("saveResult", () => {
  it("reports the new version and save time", () => {
    expect(saveResult({ data: { version: 3, updatedAt: "2026-10-08T10:00:00.000Z" } })).toEqual({
      ok: true,
      version: 3,
      savedAt: "2026-10-08T10:00:00.000Z",
    });
  });

  it("recognises a version conflict", () => {
    expect(saveResult({ errors: [{ errorType: "VersionConflict", message: "Updated by someone else — reload" }] })).toEqual({
      ok: false,
      conflict: true,
    });
  });

  it("hides any other error behind a plain message", () => {
    expect(saveResult({ errors: [{ errorType: "DynamoDB:Throttling", message: "arn:aws:..." }] })).toEqual({
      ok: false,
      message: SAVE_FAILED,
    });
    expect(saveResult({ data: null })).toEqual({ ok: false, message: SAVE_FAILED });
  });
});

describe("prepareSave media checks", () => {
  const base = { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" };

  it("accepts this invitation's own files", () => {
    const content = { ...base, media: { coverKey: "invitations/inv-1/c.jpg", gallery: [{ key: "invitations/inv-1/g.jpg" }] } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null }).ok).toBe(true);
  });

  it("rejects a file from another invitation's folder", () => {
    const content = { ...base, media: { coverKey: "invitations/inv-2/c.jpg" } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null })).toEqual({ ok: false, message: FOREIGN_FILE });
  });

  it("rejects a key that tries to step out of the folder", () => {
    const content = { ...base, media: { gallery: [{ key: "invitations/inv-1/../inv-2/g.jpg" }] } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null }).message).toBe(FOREIGN_FILE);
  });

  it("uses the library track's real file and records its id", () => {
    const content = { ...base, media: { music: { type: "library", trackId: "t1", key: "music-library/stale.mp3" } } };
    const result = prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: { id: "t1", key: "music-library/real.mp3" } });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.content).media.music).toEqual({ type: "library", trackId: "t1", key: "music-library/real.mp3" });
    expect(result.fields.musicTrackId).toBe("t1");
  });

  it("refuses a library song that no longer exists", () => {
    const content = { ...base, media: { music: { type: "library", trackId: "gone", key: "music-library/x.mp3" } } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null })).toEqual({ ok: false, message: MISSING_TRACK });
  });
});
