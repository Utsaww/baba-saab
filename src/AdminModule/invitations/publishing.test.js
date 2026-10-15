import { describe, expect, it } from "vitest";
import { PUBLISH_FAILED, publishFailure } from "./publishing";

describe("publishFailure", () => {
  it("treats a version conflict as a conflict", () => {
    expect(publishFailure([{ errorType: "VersionConflict" }])).toEqual({ ok: false, conflict: true });
  });
  it.each([
    ["SlugTaken", "That link name was just taken — try another."],
    ["InvalidSlug", "That link name isn't allowed."],
    ["NotDraft", "This invitation is already published — reload the page."],
    ["NotPublished", "Publish the invitation first."],
    ["NoSlug", "Choose a link name first."],
    ["NotFound", "That invitation no longer exists."],
  ])("maps %s", (type, message) => expect(publishFailure([{ errorType: type }])).toEqual({ ok: false, message }));
  it("falls back to the connection message", () => {
    expect(publishFailure([{ errorType: "Lambda:Unhandled" }])).toEqual({ ok: false, message: PUBLISH_FAILED });
    expect(publishFailure(undefined)).toEqual({ ok: false, message: PUBLISH_FAILED });
  });
});
