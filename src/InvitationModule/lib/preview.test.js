import { describe, expect, it } from "vitest";
import { previewInvitation } from "./preview";
import { getTemplate } from "../templates/registry";

const royal = getTemplate("royal");

describe("previewInvitation", () => {
  it("fills a brand-new draft from the template sample and says so", () => {
    const { invitation, usedSample } = previewInvitation(
      { templateId: "royal", theme: { palette: "maroon-gold" }, language: "hi" },
      royal,
    );
    expect(usedSample).toBe(true);
    expect(invitation.couple.bride.name).toEqual(royal.sample.couple.bride.name);
    expect(invitation.mainDate).toBe(royal.sample.mainDate);
    expect(invitation.language).toBe("hi");
    expect(invitation.events).toEqual([]);
  });

  it("uses the draft's own details when they are filled in", () => {
    const { invitation, usedSample } = previewInvitation(
      {
        templateId: "royal",
        theme: { palette: "maroon-gold", hidden: ["travel"] },
        couple: { bride: { name: { hi: "प्रिया" } }, groom: { name: { hi: "राहुल" } } },
        mainDate: "2027-02-14",
        venue: { name: { hi: "रिवेरा" } },
      },
      royal,
    );
    expect(usedSample).toBe(false);
    expect(invitation.couple.bride.name).toEqual({ hi: "प्रिया" });
    expect(invitation.theme.hidden).toEqual(["travel"]);
  });

  it("leaves out events that have no date yet", () => {
    const { invitation } = previewInvitation(
      {
        templateId: "royal",
        theme: { palette: "maroon-gold" },
        events: [
          { id: "a", name: { en: "Haldi" } },
          { id: "b", name: { en: "Sangeet" }, date: "2027-02-13" },
        ],
      },
      royal,
    );
    expect(invitation.events.map((e) => e.id)).toEqual(["b"]);
  });

  it("falls back to the full sample if the draft still can't be rendered", () => {
    const { invitation, usedSample } = previewInvitation(
      { templateId: "royal", theme: { palette: "maroon-gold" }, hosts: { families: "not a list" } },
      royal,
    );
    expect(usedSample).toBe(true);
    expect(invitation.couple.groom.name).toEqual(royal.sample.couple.groom.name);
  });
});
