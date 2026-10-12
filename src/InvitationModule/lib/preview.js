import { invitationSchema } from "../schema/invitation";
import { hasText } from "./i18n";

const hasValue = (s) => typeof s === "string" && s !== "";

/**
 * Turns a cleaned draft into something the template can render. Required values that are still
 * blank (names, wedding date, venue name) are borrowed from the template's sample, and
 * `usedSample` tells the editor to say so.
 */
export function previewInvitation(draft, template) {
  const sample = template.sample;
  const d = draft ?? {};
  let usedSample = false;
  const pick = (value, fallback, has = hasText) => {
    if (has(value)) return value;
    usedSample = true;
    return fallback;
  };

  const candidate = {
    ...d,
    templateId: template.id,
    theme: {
      palette: d.theme?.palette ?? sample.theme.palette,
      sectionOrder: d.theme?.sectionOrder,
      hidden: d.theme?.hidden,
    },
    couple: {
      bride: { ...d.couple?.bride, name: pick(d.couple?.bride?.name, sample.couple.bride.name) },
      groom: { ...d.couple?.groom, name: pick(d.couple?.groom?.name, sample.couple.groom.name) },
    },
    mainDate: pick(d.mainDate, sample.mainDate, hasValue),
    venue: { ...d.venue, name: pick(d.venue?.name, sample.venue.name), address: d.venue?.address ?? {} },
    events: (d.events ?? []).filter((e) => hasValue(e.id) && hasValue(e.date)).map((e) => ({ ...e, name: e.name ?? {} })),
  };

  const result = invitationSchema.safeParse(candidate);
  if (result.success) return { invitation: result.data, usedSample };
  const fallback = invitationSchema.parse({
    ...sample,
    theme: { ...sample.theme, palette: candidate.theme.palette },
    language: d.language ?? sample.language,
  });
  return { invitation: fallback, usedSample: true };
}
