import { describe, expect, it } from "vitest";
import { cleanDraft, pathKey } from "./draft";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("pathKey", () => {
  it("joins a zod path", () => {
    expect(pathKey(["events", 0, "time"])).toBe("events.0.time");
  });
});

describe("cleanDraft", () => {
  it("keeps a brand-new draft with only template, palette and language", () => {
    expect(cleanDraft(base())).toEqual({ draft: base(), errors: {} });
  });

  it("returns no draft without a valid template or palette", () => {
    expect(cleanDraft({ theme: { palette: "x" } }).draft).toBeNull();
    expect(cleanDraft({ templateId: "neon", theme: { palette: "x" } }).draft).toBeNull();
    expect(cleanDraft({ templateId: "royal", theme: {} }).draft).toBeNull();
    expect(cleanDraft(null).draft).toBeNull();
  });

  it("drops a bad event time but keeps the rest of the event and the draft", () => {
    const input = {
      ...base(),
      couple: { bride: { name: { en: "Priya" } } },
      events: [{ id: "e1", name: { en: "Sangeet" }, date: "2027-02-13", time: "25:00" }],
    };
    const { draft, errors } = cleanDraft(input);
    expect(draft.events).toEqual([{ id: "e1", name: { en: "Sangeet" }, date: "2027-02-13" }]);
    expect(draft.couple.bride.name).toEqual({ en: "Priya" });
    expect(errors).toEqual({ "events.0.time": "Use HH:mm (24-hour)" });
  });

  it("drops a Maps link that isn't a full URL", () => {
    const { draft, errors } = cleanDraft({ ...base(), venue: { name: { en: "Riviera" }, mapsUrl: "maps.google.com" } });
    expect(draft.venue).toEqual({ name: { en: "Riviera" } });
    expect(Object.keys(errors)).toEqual(["venue.mapsUrl"]);
  });

  it("drops links that are not https", () => {
    for (const mapsUrl of ["javascript:alert(1)", "http://x.com"]) {
      const { draft, errors } = cleanDraft({ ...base(), venue: { name: { en: "Riviera" }, mapsUrl } });
      expect(draft.venue).toEqual({ name: { en: "Riviera" } });
      expect(Object.keys(errors)).toEqual(["venue.mapsUrl"]);
    }
  });

  it("drops an impossible date", () => {
    const { draft, errors } = cleanDraft({ ...base(), mainDate: "2026-02-31" });
    expect(draft.mainDate).toBeUndefined();
    expect(errors.mainDate).toBe("Enter a real date");
  });

  it("drops unknown section ids", () => {
    const { draft } = cleanDraft({ ...base(), theme: { palette: "maroon-gold", sectionOrder: ["venue", "bogus", "couple"] } });
    expect(draft.theme.sectionOrder).toEqual(["venue", "couple"]);
  });

  it("trims localised text and does not mutate the input", () => {
    const input = { ...base(), couple: { groom: { name: { en: "  Rahul " } } } };
    const { draft } = cleanDraft(input);
    expect(draft.couple.groom.name.en).toBe("Rahul");
    expect(input.couple.groom.name.en).toBe("  Rahul ");
  });

  it("keeps events with no date or name yet", () => {
    const { draft, errors } = cleanDraft({ ...base(), events: [{ id: "e1", name: { en: "Haldi" } }, { id: "e2" }] });
    expect(draft.events).toEqual([{ id: "e1", name: { en: "Haldi" } }, { id: "e2" }]);
    expect(errors).toEqual({});
  });

  it("does not lose the draft over a gallery item with no key", () => {
    const { draft } = cleanDraft({
      ...base(),
      couple: { bride: { name: { en: "Priya" } } },
      media: { gallery: [{ caption: { en: "Us" } }] },
    });
    expect(draft).not.toBeNull();
    expect(draft.couple.bride.name).toEqual({ en: "Priya" });
  });

  it("drops a field of the wrong type but keeps the rest", () => {
    const { draft, errors } = cleanDraft({ ...base(), couple: { bride: { name: { en: "Priya" } } }, events: "nope" });
    expect(draft.events).toBeUndefined();
    expect(draft.couple.bride.name).toEqual({ en: "Priya" });
    expect(errors.events).toBeDefined();
  });

  it("does not apply defaults to drafts", () => {
    expect(cleanDraft(base()).draft).toEqual(base());
  });
});

describe("cleanDraft gallery limit", () => {
  it("keeps the first 12 gallery photos and explains why the rest were dropped", () => {
    const gallery = Array.from({ length: 14 }, (_, i) => ({ key: `invitations/i/${i}.jpg` }));
    const { draft, errors } = cleanDraft({ templateId: "royal", theme: { palette: "maroon-gold" }, media: { gallery } });
    expect(draft.media.gallery).toHaveLength(12);
    expect(draft.media.gallery[11].key).toBe("invitations/i/11.jpg");
    expect(errors["media.gallery"]).toBe("The gallery holds up to 12 photos");
  });
});

describe("cleanDraft keeps the RSVP channel", () => {
  it("keeps rsvp.channel", () => {
    const { draft } = cleanDraft({ templateId: "royal", theme: { palette: "maroon-gold" }, rsvp: { enabled: true, channel: "whatsapp" } });
    expect(draft.rsvp).toEqual({ enabled: true, channel: "whatsapp" });
  });

  it("keeps couple.order and drops an invalid one", () => {
    const ok = cleanDraft({ ...base(), couple: { order: "groom-first" } });
    expect(ok.draft.couple.order).toBe("groom-first");
    const bad = cleanDraft({ ...base(), couple: { order: "sideways" } });
    expect(bad.errors["couple.order"]).toBeDefined();
  });
});

describe("cleanDraft end date", () => {
  it("keeps a valid end date without an error", () => {
    const { draft, errors } = cleanDraft({ ...base(), mainDate: "2026-12-11", mainDateEnd: "2026-12-12" });
    expect(draft.mainDateEnd).toBe("2026-12-12");
    expect(errors.mainDateEnd).toBeUndefined();
  });
  it("keeps an out-of-range end date but explains it", () => {
    for (const mainDateEnd of ["2026-12-11", "2026-12-10", "2026-12-19"]) {
      const { draft, errors } = cleanDraft({ ...base(), mainDate: "2026-12-11", mainDateEnd });
      expect(draft.mainDateEnd).toBe(mainDateEnd);
      expect(errors.mainDateEnd).toBe("Pick a date 1–7 days after the wedding date");
    }
  });
  it("is optional", () => {
    const { draft, errors } = cleanDraft({ ...base(), mainDate: "2026-12-11" });
    expect(draft.mainDateEnd).toBeUndefined();
    expect(errors.mainDateEnd).toBeUndefined();
  });
});
