import { describe, expect, it, vi } from "vitest";
vi.mock("@/InvitationModule/lib/media", () => ({ mediaUrl: (k) => `https://media.example/${k}` }));
import { minimalSample } from "@/InvitationModule/templates/minimal/sample";
import { getPalette, getTemplate } from "@/InvitationModule/templates/registry";
import { cardModel } from "./cardModel";

describe("cardModel", () => {
  const inv = { ...minimalSample, templateId: "minimal" };
  it("uses the palette colours", () => {
    const vars = getPalette(getTemplate("minimal"), inv.theme.palette).vars;
    expect(cardModel(inv).colors).toEqual({ bg: vars["--bg"], text: vars["--text"], accent: vars["--primary"] });
  });
  it("uses the cover photo when there is one", () => {
    expect(cardModel({ ...inv, media: { ...inv.media, coverKey: "invitations/i/c.jpg" } }).coverUrl).toBe("https://media.example/invitations/i/c.jpg");
    expect(cardModel({ ...inv, media: { ...inv.media, coverKey: undefined } }).coverUrl).toBeNull();
  });
  it("uses Hindi names and date for hi invitations", () => {
    const hi = { ...inv, language: "hi", couple: { bride: { name: { hi: "प्रिया" } }, groom: { name: { hi: "राहुल" } } } };
    const m = cardModel(hi);
    expect(m.lang).toBe("hi");
    expect(m.names).toBe("प्रिया & राहुल");
  });
});
