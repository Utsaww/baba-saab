import { describe, expect, it } from "vitest";
import { parseInvitation, SECTION_IDS } from "./invitation";
import { minimalInvitation } from "../testing/fixtures";

describe("parseInvitation", () => {
  it("applies defaults to a minimal invitation", () => {
    const inv = parseInvitation(minimalInvitation());
    expect(inv.status).toBe("draft");
    expect(inv.language).toBe("en");
    expect(inv.showCredit).toBe(true);
    expect(inv.theme.sectionOrder).toEqual(SECTION_IDS);
    expect(inv.theme.hidden).toEqual([]);
    expect(inv.events).toEqual([]);
    expect(inv.media.gallery).toEqual([]);
    expect(inv.rsvp).toEqual({ enabled: false, askGuestCount: true, askMeal: false });
    expect(inv.invocation.deity).toBe("ganesh");
    expect(inv.hosts.families).toEqual([]);
    expect(inv.couple.bride.parentsLine).toEqual({});
  });

  it("accepts Hindi-only names", () => {
    const input = minimalInvitation();
    input.couple.bride.name = { hi: "आकृति" };
    expect(parseInvitation(input).couple.bride.name).toEqual({ hi: "आकृति" });
  });

  it("rejects a non-ISO date", () => {
    const input = { ...minimalInvitation(), mainDate: "4-12-2026" };
    expect(() => parseInvitation(input)).toThrow(/YYYY-MM-DD/);
  });

  it("rejects a 12-hour event time", () => {
    const input = { ...minimalInvitation(), events: [{ id: "e1", name: { en: "Sangeet" }, date: "2026-12-03", time: "7pm" }] };
    expect(() => parseInvitation(input)).toThrow(/HH:mm/);
  });

  it("rejects an unknown template", () => {
    expect(() => parseInvitation({ ...minimalInvitation(), templateId: "neon" })).toThrow();
  });

  it("rejects an unknown section id in sectionOrder", () => {
    const input = { ...minimalInvitation(), theme: { palette: "x", sectionOrder: ["couple", "fireworks"] } };
    expect(() => parseInvitation(input)).toThrow();
  });
});
