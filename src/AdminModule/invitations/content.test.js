import { describe, expect, it } from "vitest";
import { parseContent, prepareSave, SAVE_FAILED, saveResult } from "./content";

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
    expect(result.fields).toEqual({ templateId: "royal", mainDate: null, coupleNames: "Priya", searchText: "priya" });
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
