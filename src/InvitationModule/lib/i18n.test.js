import { describe, expect, it } from "vitest";
import { hasText, isDevanagari, plainText, textFor } from "./i18n";

describe("textFor", () => {
  it("returns the requested language", () => {
    expect(textFor({ en: "Sangeet", hi: "संगीत" }, "hi")).toBe("संगीत");
    expect(textFor({ en: "Sangeet", hi: "संगीत" }, "en")).toBe("Sangeet");
  });
  it("falls back to the other language rather than showing nothing", () => {
    expect(textFor({ en: "Sangeet" }, "hi")).toBe("Sangeet");
    expect(textFor({ hi: "संगीत" }, "en")).toBe("संगीत");
  });
  it("treats whitespace and missing values as empty", () => {
    expect(textFor({ en: "  " }, "en")).toBe("");
    expect(textFor(undefined, "en")).toBe("");
  });
});

describe("hasText", () => {
  it("is true when either language has text", () => {
    expect(hasText({ hi: "संगीत" })).toBe(true);
    expect(hasText({ en: " " })).toBe(false);
    expect(hasText(undefined)).toBe(false);
  });
});

describe("plainText", () => {
  it("joins both languages for 'both'", () => {
    expect(plainText({ en: "Venue", hi: "स्थल" }, "both")).toBe("Venue / स्थल");
    expect(plainText({ en: "Venue" }, "both")).toBe("Venue");
  });
  it("behaves like textFor for a single language", () => {
    expect(plainText({ en: "Venue", hi: "स्थल" }, "hi")).toBe("स्थल");
  });
});

describe("isDevanagari", () => {
  it("detects Devanagari", () => {
    expect(isDevanagari("शुभ विवाह")).toBe(true);
    expect(isDevanagari("Shubh Vivah")).toBe(false);
  });
});
