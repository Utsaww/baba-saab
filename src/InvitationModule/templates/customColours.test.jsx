import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { CUSTOM_COLOUR_TEMPLATES, customPaletteVars } from "../lib/colors";
import { previewInvitation } from "../lib/preview";
import { cardModel } from "../og/cardModel";
import { getTemplate, TEMPLATES } from "./registry";

const colors = { bg: "#7b1e3a", accent: "#d4af37" };
const build = (template, theme) => parseInvitation({ ...template.sample, theme: { ...template.sample.theme, ...theme } });
const wrapperStyle = (inv) => render(<InvitationRenderer invitation={inv} ctx={{ mode: "preview", skipOpening: true }} />).container.firstChild.style;

describe("custom colours", () => {
  it("are offered by Royal, Floral and Minimal only", () => {
    expect(TEMPLATES.filter((t) => t.customColours).map((t) => t.id)).toEqual(CUSTOM_COLOUR_TEMPLATES);
    expect(CUSTOM_COLOUR_TEMPLATES).toEqual(["royal", "floral", "minimal"]);
  });

  for (const id of ["royal", "floral", "minimal"]) {
    it(`${id} renders the derived colours`, () => {
      const style = wrapperStyle(build(getTemplate(id), { palette: "custom", colors }));
      const derived = customPaletteVars(colors);
      for (const key of ["--bg", "--surface", "--text", "--muted", "--primary", "--on-primary"]) {
        expect(style.getPropertyValue(key), key).toBe(derived[key]);
      }
      expect(style.getPropertyValue("--bg")).toBe("#7b1e3a");
    });
  }

  for (const id of ["temple", "velvet"]) {
    it(`${id} ignores them and uses its first palette`, () => {
      const template = getTemplate(id);
      const style = wrapperStyle(build(template, { palette: "custom", colors }));
      expect(style.getPropertyValue("--bg")).toBe(template.palettes[0].vars["--bg"]);
    });
  }

  it("fall back to the first palette when the colours are missing", () => {
    const royal = getTemplate("royal");
    expect(wrapperStyle(build(royal, { palette: "custom" })).getPropertyValue("--bg")).toBe(royal.palettes[0].vars["--bg"]);
  });

  it("are kept in the theme but unused while a named palette is chosen", () => {
    const royal = getTemplate("royal");
    const style = wrapperStyle(build(royal, { palette: royal.palettes[1].id, colors }));
    expect(style.getPropertyValue("--bg")).toBe(royal.palettes[1].vars["--bg"]);
  });

  it("colour the share card", () => {
    const inv = build(getTemplate("minimal"), { palette: "custom", colors });
    const derived = customPaletteVars(colors);
    expect(cardModel(inv).colors).toEqual({ bg: "#7b1e3a", text: derived["--text"], accent: "#d4af37" });
  });

  it("reach the editor preview", () => {
    const royal = getTemplate("royal");
    const { invitation } = previewInvitation({ templateId: "royal", theme: { palette: "custom", colors } }, royal);
    expect(invitation.theme.colors).toEqual(colors);
  });
});
