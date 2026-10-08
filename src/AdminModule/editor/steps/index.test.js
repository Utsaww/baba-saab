import { describe, expect, it } from "vitest";
import { guideHref, STEPS, stepHasContent } from "./index";
import { stepNumber } from "../stepNumber";

describe("STEPS", () => {
  it("has the eight editor steps in order", () => {
    expect(STEPS.map((s) => s.title)).toEqual([
      "Template & palette",
      "Couple & families",
      "Date, venue & travel",
      "Events",
      "Photos, film & music",
      "Sections",
      "RSVP & settings",
      "Review",
    ]);
  });

  it("links each step to its guide section", () => {
    expect(guideHref(STEPS[2])).toBe("/admin/help#editor-step-3-date-venue-travel");
  });
});

describe("stepNumber", () => {
  it("accepts 1–8 and falls back to 1", () => {
    expect(stepNumber("4")).toBe(4);
    expect(stepNumber("9")).toBe(1);
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
    expect(stepHasContent(8, content)).toBe(false);
  });
});
