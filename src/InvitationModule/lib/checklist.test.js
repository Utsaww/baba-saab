import { describe, expect, it } from "vitest";
import { publishChecklist, requiredLanguages, stepForPath } from "./checklist";

const complete = () => ({
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Riviera Resort" }, address: { en: "MG Road, Jaipur" } },
  events: [{ id: "e1", name: { en: "Sangeet" }, date: "2027-02-13", time: "19:30" }],
});

describe("requiredLanguages", () => {
  it("follows the invitation language", () => {
    expect(requiredLanguages("en")).toEqual(["en"]);
    expect(requiredLanguages("hi")).toEqual(["hi"]);
    expect(requiredLanguages("both")).toEqual(["en", "hi"]);
    expect(requiredLanguages(undefined)).toEqual(["en"]);
  });
});

describe("stepForPath", () => {
  it("maps fields to the editor step that fixes them", () => {
    expect(stepForPath(["theme", "palette"])).toBe(1);
    expect(stepForPath(["couple", "bride", "name"])).toBe(2);
    expect(stepForPath(["venue", "mapsUrl"])).toBe(3);
    expect(stepForPath(["events", 0, "date"])).toBe(4);
    expect(stepForPath(["media", "film"])).toBe(5);
    expect(stepForPath(["theme", "hidden"])).toBe(6);
    expect(stepForPath(["rsvp", "deadline"])).toBe(7);
  });
});

describe("publishChecklist", () => {
  it("is empty for a complete invitation", () => {
    expect(publishChecklist(complete())).toEqual([]);
  });

  it("lists everything a brand-new draft is missing, with the step that fixes it", () => {
    const items = publishChecklist({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });
    expect(items.map((i) => [i.message, i.step])).toEqual([
      ["Add the bride's name", 2],
      ["Add the groom's name", 2],
      ["Add the wedding date", 3],
      ["Add the venue name", 3],
      ["Add the venue address", 3],
    ]);
  });

  it("asks for both languages when the invitation is in both", () => {
    const messages = publishChecklist({ ...complete(), language: "both" }).map((i) => i.message);
    expect(messages).toContain("Add the bride's name in Hindi");
    expect(messages).toContain("Add the venue address in Hindi");
    expect(messages).not.toContain("Add the bride's name in English");
  });

  it("names the event that needs a time or date", () => {
    const draft = complete();
    draft.events = [{ id: "e1", name: { en: "Sangeet" } }];
    expect(publishChecklist(draft)).toEqual([
      { id: "event0.date", message: "Add a date for Sangeet", step: 4 },
      { id: "event0.time", message: "Add a time for Sangeet", step: 4 },
    ]);
  });

  it("calls an unnamed event by its number", () => {
    const draft = complete();
    draft.events = [{ id: "e1", date: "2027-02-13", time: "10:00" }];
    expect(publishChecklist(draft).map((i) => i.message)).toEqual(["Add a name for event 1"]);
  });
});
