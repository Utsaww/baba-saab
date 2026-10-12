import { SECTION_IDS } from "../schema/invitation";
import { hasText } from "./i18n";
import { invocationText } from "./invocations";

const hasContent = {
  invocation: (inv) => inv.invocation.deity !== "none" || hasText(invocationText(inv.invocation)),
  couple: () => true,
  saveTheDate: () => true,
  countdown: () => true,
  venue: (inv) => hasText(inv.venue.name),
  travel: (inv) => hasText(inv.venue.travelNotes),
  schedule: (inv) => inv.events.length > 0,
  gallery: (inv) => inv.media.gallery.length > 0,
  film: (inv) => Boolean(inv.media.film?.url || inv.media.film?.key),
  rsvp: (inv) => inv.rsvp.enabled,
  closing: (inv) => hasText(inv.hosts.closingLine) || inv.hosts.families.some(hasText),
};

// Staff order first; unknown ids dropped; any section missing from that order is appended so new sections never vanish.
export function orderedSectionIds(theme) {
  const order = [...new Set((theme?.sectionOrder ?? []).filter((id) => SECTION_IDS.includes(id)))];
  for (const id of SECTION_IDS) if (!order.includes(id)) order.push(id);
  return order;
}

export function visibleSections(inv) {
  const hidden = new Set(inv.theme.hidden);
  return orderedSectionIds(inv.theme).filter((id) => !hidden.has(id) && hasContent[id](inv));
}
