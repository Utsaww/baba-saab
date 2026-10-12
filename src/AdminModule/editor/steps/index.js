import { hasText } from "@/InvitationModule/lib/i18n";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { slugify } from "../../guideAnchors";
import TemplateStep from "./TemplateStep";
import CoupleStep from "./CoupleStep";
import VenueStep from "./VenueStep";
import EventsStep from "./EventsStep";
import MediaStep from "./MediaStep";
import SectionsStep from "./SectionsStep";
import RsvpStep from "./RsvpStep";
import ReviewStep from "./ReviewStep";

export const STEPS = [
  { number: 1, title: "Template & palette", Component: TemplateStep },
  { number: 2, title: "Couple & families", Component: CoupleStep },
  { number: 3, title: "Date, venue & travel", Component: VenueStep },
  { number: 4, title: "Events", Component: EventsStep },
  { number: 5, title: "Photos, film & music", Component: MediaStep },
  { number: 6, title: "Sections", Component: SectionsStep },
  { number: 7, title: "RSVP & settings", Component: RsvpStep },
  { number: 8, title: "Review", Component: ReviewStep },
];

/** Must match the "## Editor step N: Title" headings in docs/admin-guide.md. */
export const guideHref = (step) => `/admin/help#${slugify(`Editor step ${step.number}: ${step.title}`)}`;

export function stepHasContent(number, content) {
  switch (number) {
    case 1:
      return Boolean(content.templateId && content.theme?.palette);
    case 2:
      return hasText(content.couple?.bride?.name) || hasText(content.couple?.groom?.name);
    case 3:
      return Boolean(content.mainDate) || hasText(content.venue?.name);
    case 4:
      return (content.events ?? []).length > 0;
    case 5:
      return Boolean(content.media?.film?.url);
    case 6:
      return (content.theme?.hidden ?? []).length > 0 || (content.theme?.sectionOrder ?? []).length > 0;
    case 7:
      return Boolean(content.rsvp?.enabled);
    case 8:
      return publishChecklist(cleanDraft(content).draft ?? {}).length === 0;
    default:
      return false;
  }
}
