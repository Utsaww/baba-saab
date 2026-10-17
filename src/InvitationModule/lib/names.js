import { textFor } from "./i18n";

export const isGroomFirst = (inv) => inv.couple?.order === "groom-first";

/** [first, second] person objects, following the invitation's "who is named first" setting. */
export function couplePair(inv) {
  const { bride, groom } = inv.couple;
  return isGroomFirst(inv) ? [groom, bride] : [bride, groom];
}

export function coupleTitle(inv, lang = "en") {
  const [a, b] = couplePair(inv);
  return `${textFor(a.name, lang)} & ${textFor(b.name, lang)}`;
}

export function monogram(inv) {
  const first = (v) => Array.from(textFor(v, "en"))[0] ?? "";
  const [a, b] = couplePair(inv);
  return `${first(a.name)}&${first(b.name)}`;
}
