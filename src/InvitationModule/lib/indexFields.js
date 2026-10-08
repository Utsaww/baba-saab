import { textFor } from "./i18n";

const clean = (s) => (typeof s === "string" ? s.trim() : "");

/** The searchable, listable columns stored next to an invitation's content. Always derived, never typed in. */
export function indexFields(draft) {
  const bride = draft.couple?.bride?.name;
  const groom = draft.couple?.groom?.name;
  const names = [textFor(bride, "en"), textFor(groom, "en")].filter(Boolean);
  const phoneDigits = clean(draft.hosts?.contactPhone).replace(/\D/g, "");
  const searchParts = [bride?.en, bride?.hi, groom?.en, groom?.hi].map(clean).filter(Boolean);
  if (phoneDigits) searchParts.push(phoneDigits);
  return {
    templateId: draft.templateId,
    mainDate: draft.mainDate ?? null,
    coupleNames: names.length ? names.join(" & ") : "Untitled invitation",
    searchText: searchParts.join(" ").toLowerCase(),
  };
}
