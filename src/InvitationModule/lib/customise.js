import { formatDateRange, formatShortDate } from "./datetime";

// Readers for inv.custom, so templates never touch the raw field.
export const shortDate = (inv, lang) => formatShortDate(inv.mainDate, inv.mainDateEnd, inv.custom?.dateStyle, lang === "hi" ? "hi" : "en");

// The long date on the share card: today's format unless a style was chosen.
export function cardDate(inv, lang) {
  const style = inv.custom?.dateStyle;
  return !style || style === "classic" ? formatDateRange(inv.mainDate, inv.mainDateEnd, lang) : shortDate(inv, lang);
}
