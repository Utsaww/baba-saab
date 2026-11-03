import { describe, expect, it } from "vitest";
import { accentPasses, contrastRatio, customPaletteVars, isHex, suggestAccent, toHsl } from "./colors";

const BACKGROUNDS = ["#ffffff", "#000000", "#7b1e3a", "#808080", "#fff8e7", "#0b1d3a"];
const ACCENTS = ["#d4af37", "#ffffff", "#000000", "#c0392b"];
const hueGap = (a, b) => {
  const d = Math.abs(toHsl(a)[0] - toHsl(b)[0]) % 360;
  return Math.min(d, 360 - d);
};

describe("isHex", () => {
  it("accepts 6-digit hex codes only", () => {
    expect(isHex("#7B1E3A")).toBe(true);
    expect(isHex("#7b1e3a")).toBe(true);
    for (const bad of ["#12", "7b1e3a", "#7b1e3g", "#fff", "", undefined, null]) expect(isHex(bad), String(bad)).toBe(false);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white, whichever order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });
});

describe("customPaletteVars", () => {
  for (const bg of BACKGROUNDS) {
    for (const accent of ACCENTS) {
      it(`keeps text readable for bg ${bg}, accent ${accent}`, () => {
        const v = customPaletteVars({ bg, accent });
        expect(v["--bg"]).toBe(bg);
        expect(v["--primary"]).toBe(accent);
        expect(v["--accent"]).toBe(accent);
        for (const fg of ["--text", "--muted", "--error"]) {
          for (const on of ["--bg", "--surface"]) expect(contrastRatio(v[fg], v[on]), `${fg} on ${on}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(v["--on-primary"], v["--primary"])).toBeGreaterThanOrEqual(4.5);
        for (const key of ["--surface", "--text", "--muted", "--on-primary", "--error"]) expect(isHex(v[key]), key).toBe(true);
      });
    }
  }

  it("keeps the usual error reds where they read", () => {
    expect(customPaletteVars({ bg: "#fff8e7", accent: "#7b1e3a" })["--error"]).toBe("#b42318");
    expect(customPaletteVars({ bg: "#0b1d3a", accent: "#d4af37" })["--error"]).toBe("#ff8a80");
  });
});

describe("accentPasses / suggestAccent", () => {
  it("rejects a pale gold on cream and accepts maroon on cream", () => {
    expect(accentPasses({ bg: "#fff8e7", accent: "#f3e5ab" })).toBe(false);
    expect(accentPasses({ bg: "#fff8e7", accent: "#7b1e3a" })).toBe(true);
  });

  it("never makes an accent worse when a passing one is the same distance either way", () => {
    expect(suggestAccent({ bg: "#fff8e7", accent: "#7b1e3a" })).toBe("#7b1e3a");
  });

  for (const [bg, accent] of [
    ["#fff8e7", "#f3e5ab"],
    ["#0b1d3a", "#1e3a8a"],
    ["#7b1e3a", "#8a2b45"],
    ["#ffffff", "#ffd700"],
    ["#000000", "#300040"],
  ]) {
    it(`suggests a passing accent near ${accent} on ${bg}`, () => {
      const suggested = suggestAccent({ bg, accent });
      expect(isHex(suggested)).toBe(true);
      expect(accentPasses({ bg, accent: suggested })).toBe(true);
      expect(hueGap(suggested, accent)).toBeLessThanOrEqual(15);
    });
  }
});
