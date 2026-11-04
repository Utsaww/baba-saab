import { describe, it, expect } from 'vitest';
import { buildTimeline } from './timeline';

describe('buildTimeline', () => {
  it('approved pace when it fits', () => {
    const t = buildTimeline({ stops: [0, 778, 1049, 2171, 2454, 2736, 3019, 3289], end: 5455 });
    expect(t.speed).toBe(250);
    expect(t.hold).toBe(1.2);
    expect(t.finalHold).toBe(2);
    expect(t.total).toBeGreaterThan(35);
    expect(t.total).toBeLessThan(50);
  });

  it('never over 60 s; speeds up before shrinking holds', () => {
    const stops = Array.from({ length: 12 }, (_, i) => Math.round((i * 30000) / 12));
    const t = buildTimeline({ stops, end: 30000 });
    expect(t.total).toBeLessThanOrEqual(60);
    expect(t.hold).toBeGreaterThanOrEqual(0.8);
    expect(t.speed).toBeGreaterThan(250);
  });

  it("holds shrink only after speed alone can't fit", () => {
    const stops = Array.from({ length: 40 }, (_, i) => i * 10);
    const t = buildTimeline({ stops, end: 450 });
    expect(t.total).toBeLessThanOrEqual(60);
    expect(t.hold).toBeLessThan(1.2);
    expect(t.hold).toBeGreaterThanOrEqual(0.8);
  });

  it('short page is stretched to 20 s by the final hold', () => {
    const t = buildTimeline({ stops: [0], end: 300 });
    expect(t.total).toBeCloseTo(20, 5);
    expect(t.finalHold).toBeGreaterThan(2);
  });

  it('duplicate and negative stops collapse', () => {
    const t = buildTimeline({ stops: [-5, 0, 0, 400], end: 400 });
    expect(t.targets).toEqual([0, 400, 400]);
  });
});
