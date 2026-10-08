import { invitationSchema } from "../schema/invitation";
import { textFor } from "./i18n";

const LANGUAGE_NAMES = { en: "English", hi: "Hindi" };

export function requiredLanguages(language) {
  if (language === "both") return ["en", "hi"];
  return [language === "hi" ? "hi" : "en"];
}

const STEP_FOR_FIELD = {
  templateId: 1,
  language: 1,
  couple: 2,
  hosts: 2,
  invocation: 2,
  mainDate: 3,
  venue: 3,
  events: 4,
  media: 5,
  theme: 6,
  rsvp: 7,
  showCredit: 7,
};

export function stepForPath(path) {
  if (path[0] === "theme" && path[1] === "palette") return 1;
  return STEP_FOR_FIELD[path[0]] ?? 8;
}

const filled = (s) => typeof s === "string" && s.trim() !== "";

/** What still stops this draft being published, as plain sentences with the step that fixes each. */
export function publishChecklist(draft) {
  const items = [];
  const langs = requiredLanguages(draft.language);
  const both = langs.length > 1;
  const add = (id, message, step) => items.push({ id, message, step });
  const needText = (id, label, value, step) => {
    for (const lang of langs) {
      if (!filled(value?.[lang])) add(`${id}.${lang}`, both ? `Add ${label} in ${LANGUAGE_NAMES[lang]}` : `Add ${label}`, step);
    }
  };

  needText("bride", "the bride's name", draft.couple?.bride?.name, 2);
  needText("groom", "the groom's name", draft.couple?.groom?.name, 2);
  if (!draft.mainDate) add("mainDate", "Add the wedding date", 3);
  needText("venueName", "the venue name", draft.venue?.name, 3);
  needText("venueAddress", "the venue address", draft.venue?.address, 3);
  (draft.events ?? []).forEach((event, i) => {
    const name = textFor(event.name, langs[0]) || `event ${i + 1}`;
    needText(`event${i}.name`, `a name for event ${i + 1}`, event.name, 4);
    if (!event.date) add(`event${i}.date`, `Add a date for ${name}`, 4);
    if (!event.time) add(`event${i}.time`, `Add a time for ${name}`, 4);
  });

  // Anything the strict schema still rejects once the obvious gaps are filled.
  if (items.length === 0) {
    const result = invitationSchema.safeParse(draft);
    if (!result.success) {
      for (const issue of result.error.issues) {
        add(`schema.${issue.path.join(".")}`, `Check ${issue.path.join(" › ")}: ${issue.message}`, stepForPath(issue.path));
      }
    }
  }
  return items;
}
