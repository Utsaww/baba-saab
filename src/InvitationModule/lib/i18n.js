const clean = (s) => (typeof s === "string" ? s.trim() : "");

// Text for one language, falling back to the other so a section is never blank.
export function textFor(value, lang) {
  const en = clean(value?.en);
  const hi = clean(value?.hi);
  if (lang === "hi") return hi || en;
  return en || hi;
}

export function hasText(value) {
  return Boolean(clean(value?.en) || clean(value?.hi));
}

// Single-string form for attributes (alt, aria-label, option text).
export function plainText(value, lang) {
  if (lang === "both") {
    const en = clean(value?.en);
    const hi = clean(value?.hi);
    return en && hi ? `${en} / ${hi}` : en || hi;
  }
  return textFor(value, lang);
}

export function isDevanagari(str) {
  return /[ऀ-ॿ]/.test(str ?? "");
}
