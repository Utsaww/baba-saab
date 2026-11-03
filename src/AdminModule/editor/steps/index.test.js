import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guideHref, STEPS, stepHasContent } from "./index";
import { stepNumber } from "../stepNumber";

describe("STEPS", () => {
  it("has the nine editor steps in order", () => {
    expect(STEPS.map((s) => s.title)).toEqual([
      "Template & palette",
      "Couple & families",
      "Date, venue & travel",
      "Events",
      "Photos, film & music",
      "Sections",
      "Wording & style",
      "Settings",
      "Review",
    ]);
  });

  it("links each step to its guide section", () => {
    expect(guideHref(STEPS[2])).toBe("/admin/help#editor-step-3-date-venue-travel");
    expect(guideHref(STEPS[6])).toBe("/admin/help#editor-step-7-wording-style");
  });

  it("has nine steps, each with a heading in the admin guide", () => {
    expect(STEPS).toHaveLength(9);
    const guide = readFileSync("docs/admin-guide.md", "utf8");
    for (const s of STEPS) expect(guide).toContain(`## Editor step ${s.number}: ${s.title}`);
  });
});

describe("stepNumber", () => {
  it("accepts 1–8 and falls back to 1", () => {
    expect(stepNumber("4")).toBe(4);
    expect(stepNumber("9")).toBe(9);
    expect(stepNumber("10")).toBe(1);
    expect(stepNumber(undefined)).toBe(1);
    expect(stepNumber("two")).toBe(1);
  });
});

describe("stepHasContent", () => {
  it("ticks steps that have something filled in", () => {
    const content = { templateId: "royal", theme: { palette: "maroon-gold" }, couple: { groom: { name: { en: "Rahul" } } } };
    expect(stepHasContent(1, content)).toBe(true);
    expect(stepHasContent(2, content)).toBe(true);
    expect(stepHasContent(3, content)).toBe(false);
    expect(stepHasContent(4, { events: [{ id: "a" }] })).toBe(true);
    expect(stepHasContent(9, content)).toBe(false);
  });
  it("ticks step 7 for custom wording but not for dateStyle alone", () => {
    expect(stepHasContent(7, { custom: { text: {} } })).toBe(true);
    expect(stepHasContent(7, { custom: { dateStyle: "long" } })).toBe(false);
    expect(stepHasContent(7, {})).toBe(false);
  });
  it("ticks step 8 when guests reply on WhatsApp or the credit is off", () => {
    expect(stepHasContent(8, { rsvp: { enabled: true, channel: "whatsapp" } })).toBe(true);
    expect(stepHasContent(8, { rsvp: { enabled: true } })).toBe(false); // legacy, not opted in
    expect(stepHasContent(8, { rsvp: { enabled: false } })).toBe(false);
    expect(stepHasContent(8, {})).toBe(false);
    expect(stepHasContent(8, { showCredit: true })).toBe(false);
    expect(stepHasContent(8, { showCredit: false })).toBe(true);
  });
});
