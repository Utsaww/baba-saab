import { describe, expect, it } from "vitest";
import { seeded, round1 } from "./seeded";

describe("seeded", () => {
  it("returns the same sequence for the same seed", () => {
    const a = seeded(42);
    const b = seeded(42);
    const seqA = Array.from({ length: 50 }, a);
    const seqB = Array.from({ length: 50 }, b);
    expect(seqA).toEqual(seqB);
  });

  it("returns a different sequence for a different seed", () => {
    const a = Array.from({ length: 10 }, seeded(1));
    const b = Array.from({ length: 10 }, seeded(2));
    expect(a).not.toEqual(b);
  });

  it("stays within [0, 1) and spreads its values", () => {
    const values = Array.from({ length: 2000 }, seeded(7));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it("rounds to one decimal so SVG markup stays short and stable", () => {
    expect(round1(12.345)).toBe(12.3);
    expect(round1(-0.04)).toBe(0);
  });
});
