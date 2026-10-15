import { formatDate } from "./datetime";
import { textFor } from "./i18n";

export const PREVIEW_TITLE = "Wedding invitation preview";

const lang = (inv) => (inv.language === "hi" ? "hi" : "en");

export function ogTitle(inv) {
  const l = lang(inv);
  const bride = textFor(inv.couple.bride.name, l);
  const groom = textFor(inv.couple.groom.name, l);
  return l === "hi" ? `${bride} और ${groom} का शुभ विवाह` : `${bride} & ${groom} are getting married`;
}

export function ogDescription(inv) {
  const l = lang(inv);
  return [formatDate(inv.mainDate, l), textFor(inv.venue?.name, l)].filter(Boolean).join(" · ");
}
