import RoyalTemplate from "./royal";
import { royalFontVars, royalPalettes } from "./royal/palettes";
import { royalSample } from "./royal/sample";
import FloralTemplate from "./floral";
import { floralFontVars, floralPalettes } from "./floral/palettes";
import { floralSample } from "./floral/sample";

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
  {
    id: "floral",
    name: "Floral Pastel",
    description: "Soft watercolour florals in pastel tones. The cover opens with a gentle scroll.",
    Component: FloralTemplate,
    palettes: floralPalettes,
    fontVars: floralFontVars,
    sample: floralSample,
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
