import RoyalTemplate from "./royal";
import { royalFontVars, royalPalettes } from "./royal/palettes";
import { royalSample } from "./royal/sample";

export const TEMPLATES = [
  {
    id: "royal",
    name: "Royal Rajasthani",
    description: "Maroon and gold with a palace-arch frame. Guests scratch a gold card to reveal the date.",
    Component: RoyalTemplate,
    palettes: royalPalettes,
    fontVars: royalFontVars,
    sample: royalSample,
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getPalette(template, paletteId) {
  return template.palettes.find((p) => p.id === paletteId) ?? template.palettes[0];
}

export function themeStyle(template, paletteId) {
  return { ...template.fontVars, ...getPalette(template, paletteId).vars };
}
