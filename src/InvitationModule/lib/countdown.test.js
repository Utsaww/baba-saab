import { describe, expect, it } from "vitest";
import { countdownTarget, timeLeft } from "./countdown";
import { parseInvitation } from "../schema/invitation";
import { minimalInvitation } from "../testing/fixtures";

describe("timeLeft", () => {
  it("splits the remaining time into units", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    expect(timeLeft(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  });
  it("never goes negative once the target has passed", () => {
    expect(timeLeft(1000, 5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });
});

describe("countdownTarget", () => {
  it("counts down to midnight IST when no event is on the main date", () => {
    const inv = parseInvitation(minimalInvitation());
    expect(new Date(countdownTarget(inv)).toISOString()).toBe("2026-12-03T18:30:00.000Z");
  });
  it("counts down to the earliest timed event on the main date", () => {
    const inv = parseInvitation({
      ...minimalInvitation(),
      events: [
        { id: "a", name: { en: "Vivah" }, date: "2026-12-04", time: "19:00" },
        { id: "b", name: { en: "Baraat" }, date: "2026-12-04", time: "16:00" },
        { id: "c", name: { en: "Mehendi" }, date: "2026-12-03", time: "11:00" },
      ],
    });
    expect(new Date(countdownTarget(inv)).toISOString()).toBe("2026-12-04T10:30:00.000Z");
  });
});
