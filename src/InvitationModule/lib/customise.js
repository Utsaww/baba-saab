import { formatDateRange, formatShortDate } from "./datetime";
import { EDITABLE_TEXT_KEYS, UI } from "./ui-strings";

// Readers for inv.custom, so templates never touch the raw field.
export const shortDate = (inv, lang) => formatShortDate(inv.mainDate, inv.mainDateEnd, inv.custom?.dateStyle, lang === "hi" ? "hi" : "en");

// The long date on the share card: today's format unless a style was chosen.
export function cardDate(inv, lang) {
  const style = inv.custom?.dateStyle;
  return !style || style === "classic" ? formatDateRange(inv.mainDate, inv.mainDateEnd, lang) : shortDate(inv, lang);
}

// The guest-facing wording: UI with staff overrides; a language left blank keeps the template's line.
export function uiText(inv) {
  const text = inv.custom?.text;
  if (!text) return UI;
  const ui = { ...UI };
  for (const key of EDITABLE_TEXT_KEYS) {
    const o = text[key];
    if (o) ui[key] = { en: o.en || UI[key].en, hi: o.hi || UI[key].hi };
  }
  return ui;
}
