import { formatDate } from "./datetime";
import { textFor } from "./i18n";
import { couplePair } from "./names";

export const PREVIEW_TITLE = "Wedding invitation preview";

const lang = (inv) => (inv.language === "hi" ? "hi" : "en");

export function ogTitle(inv) {
  const l = lang(inv);
  const [first, second] = couplePair(inv).map((p) => textFor(p.name, l));
  return l === "hi" ? `${first} और ${second} का शुभ विवाह` : `${first} & ${second} are getting married`;
}

export function ogDescription(inv) {
  const l = lang(inv);
  return [formatDate(inv.mainDate, l), textFor(inv.venue?.name, l)].filter(Boolean).join(" · ");
}
