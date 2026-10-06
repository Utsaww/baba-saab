import { textFor } from "./i18n";

export function coupleTitle(inv, lang = "en") {
  return `${textFor(inv.couple.bride.name, lang)} & ${textFor(inv.couple.groom.name, lang)}`;
}

export function monogram(inv) {
  const first = (v) => Array.from(textFor(v, "en"))[0] ?? "";
  return `${first(inv.couple.bride.name)}&${first(inv.couple.groom.name)}`;
}
