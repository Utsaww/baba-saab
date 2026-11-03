import { describe, expect, it } from "vitest";
import { cardDate, dateProps, shortDate, textStyleVars, uiText } from "./customise";
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

describe("textStyleVars", () => {
  it("is empty without styles", () => {
    expect(textStyleVars({})).toEqual({});
    expect(textStyleVars({ custom: { styles: {} } })).toEqual({});
  });
  it("sets only the chosen values", () => {
    expect(textStyleVars({ custom: { styles: { names: { size: "xl", bold: true } } } })).toEqual({ "--names-scale": "1.4", "--names-weight": "700" });
    expect(textStyleVars({ custom: { styles: { headings: { size: "sm", italic: true } } } })).toEqual({ "--headings-scale": "0.85", "--headings-style": "italic" });
  });
  it("skips normal size and switched-off toggles", () => {
    expect(textStyleVars({ custom: { styles: { parents: { size: "md", bold: false, italic: false } } } })).toEqual({});
  });
});

describe("dateProps", () => {
  const inv = (dateStyle) => ({ mainDate: "2026-12-11", custom: dateStyle ? { dateStyle } : undefined });
  it("marks a Hindi date as Hindi", () => {
    expect(dateProps(inv("dayMonth"), "hi")).toEqual({ children: "11 दिसंबर 2026", lang: "hi" });
  });
  it("leaves digits-only and English dates unmarked", () => {
    expect(dateProps(inv(), "hi")).toEqual({ children: "11 · 12 · 2026", lang: undefined });
    expect(dateProps(inv("dayMonth"), "en").lang).toBeUndefined();
  });
});
