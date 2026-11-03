import { describe, expect, it } from "vitest";
import { cardDate, shortDate, uiText } from "./customise";
import { UI } from "./ui-strings";
import { formatDateRange } from "./datetime";

const inv = (custom) => ({ mainDate: "2026-12-11", mainDateEnd: "2026-12-12", custom });

describe("shortDate", () => {
  it("defaults to classic", () => expect(shortDate(inv(), "en")).toBe("11–12 · 12 · 2026"));
  it("follows the style and language", () => {
    expect(shortDate(inv({ dateStyle: "ordinal" }), "en")).toBe("11th & 12th Dec 2026");
    expect(shortDate(inv({ dateStyle: "dayMonth" }), "hi")).toBe("11 और 12 दिसंबर 2026");
    expect(shortDate(inv({ dateStyle: "dayMonth" }), "both")).toBe("11 & 12 December 2026");
  });
});

describe("cardDate", () => {
  it("is today's long date without a style", () => {
    expect(cardDate(inv(), "en")).toBe(formatDateRange("2026-12-11", "2026-12-12", "en"));
    expect(cardDate(inv({ dateStyle: "classic" }), "hi")).toBe(formatDateRange("2026-12-11", "2026-12-12", "hi"));
  });
  it("uses the chosen style otherwise", () => expect(cardDate(inv({ dateStyle: "ordinal" }), "en")).toBe("11th & 12th Dec 2026"));
});

describe("uiText", () => {
  it("is the template's wording without overrides", () => {
    expect(uiText({})).toEqual(UI);
    expect(uiText({ custom: {} })).toEqual(UI);
  });
  it("replaces a line, falling back per language", () => {
    const ui = uiText({ custom: { text: { together: { en: "You are cordially invited to the wedding of" } } } });
    expect(ui.together.en).toBe("You are cordially invited to the wedding of");
    expect(ui.together.hi).toBe(UI.together.hi);
    expect(ui.weddingOf).toEqual(UI.weddingOf);
  });
  it("treats an empty override as unset", () => {
    expect(uiText({ custom: { text: { venue: { en: "", hi: "जगह" } } } }).venue).toEqual({ en: UI.venue.en, hi: "जगह" });
  });
  it("never overrides fixed labels", () => {
    const ui = uiText({ custom: { text: { submit: { en: "x" }, credit: { en: "y" } } } });
    expect(ui.submit).toEqual(UI.submit);
    expect(ui.credit).toEqual(UI.credit);
  });
});
