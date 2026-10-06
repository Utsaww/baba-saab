import { describe, expect, it } from "vitest";
import { INVOCATIONS, invocationText } from "./invocations";

describe("invocationText", () => {
  it("uses the preset text when a known preset is chosen", () => {
    const text = invocationText({ presetId: "shri-ganeshaya", text: { en: "ignored" } });
    expect(text).toEqual({ hi: "॥ श्री गणेशाय नमः ॥" });
  });
  it("falls back to custom text for an unknown or missing preset", () => {
    expect(invocationText({ presetId: "nope", text: { en: "Om" } })).toEqual({ en: "Om" });
    expect(invocationText({ text: { hi: "ॐ" } })).toEqual({ hi: "ॐ" });
    expect(invocationText(undefined)).toEqual({});
  });
  it("ships the five approved presets", () => {
    expect(INVOCATIONS.map((i) => i.id)).toEqual(["vakratunda", "shri-ganeshaya", "mangalam", "shubh-vivah", "om"]);
  });
});
