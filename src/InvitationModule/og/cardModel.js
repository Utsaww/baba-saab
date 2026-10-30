import { formatDateRange } from "@/InvitationModule/lib/datetime";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { coupleTitle } from "@/InvitationModule/lib/names";
import { getPalette, getTemplate } from "@/InvitationModule/templates/registry";

/** Everything the share card shows, decided outside the image renderer so it can be tested. */
export function cardModel(invitation) {
  const lang = invitation.language === "hi" ? "hi" : "en";
  const vars = getPalette(getTemplate(invitation.templateId), invitation.theme?.palette).vars;
  const coverKey = invitation.media?.coverKey;
  return {
    lang,
    // Devanagari subset has no Latin glyphs (&, digits), so hi cards fall back to the Latin face per glyph.
    fontFamily: lang === "hi" ? "Devanagari, Display" : "Display",
    names: coupleTitle(invitation, lang),
    date: formatDateRange(invitation.mainDate, invitation.mainDateEnd, lang),
    coverUrl: coverKey ? mediaUrl(coverKey) : null,
    colors: { bg: vars["--bg"], text: vars["--text"], accent: vars["--primary"] },
  };
}
