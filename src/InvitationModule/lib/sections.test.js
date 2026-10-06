import { describe, expect, it } from "vitest";
import { visibleSections } from "./sections";
import { parseInvitation } from "../schema/invitation";
import { minimalInvitation } from "../testing/fixtures";

const build = (overrides = {}) => parseInvitation({ ...minimalInvitation(), ...overrides });

describe("visibleSections", () => {
  it("shows only sections with content for a sparse invitation", () => {
    expect(visibleSections(build())).toEqual(["invocation", "couple", "saveTheDate", "countdown", "venue"]);
  });

  it("drops the invocation when deity is none and there is no text", () => {
    expect(visibleSections(build({ invocation: { deity: "none" } }))).not.toContain("invocation");
  });

  it("shows content-driven sections once they have content", () => {
    const inv = build({
      venue: { name: { en: "Riviera" }, travelNotes: { en: "Airport 20 km" } },
      events: [{ id: "e", name: { en: "Sangeet" }, date: "2026-12-03" }],
      media: { gallery: [{ key: "a.jpg" }], film: { type: "youtube", url: "https://youtu.be/abcdefghijk" } },
      rsvp: { enabled: true },
      hosts: { families: [{ en: "Sharma family" }] },
    });
    expect(visibleSections(inv)).toEqual([
      "invocation", "couple", "saveTheDate", "countdown", "venue", "travel", "schedule", "gallery", "film", "rsvp", "closing",
    ]);
  });

  it("follows the custom order, removes hidden and duplicate ids, and appends missing ids", () => {
    const inv = build({ theme: { palette: "p", sectionOrder: ["venue", "couple", "venue"], hidden: ["countdown"] } });
    expect(visibleSections(inv)).toEqual(["venue", "couple", "invocation", "saveTheDate"]);
  });
});
