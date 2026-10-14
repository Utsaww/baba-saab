import { formatDate } from "@/InvitationModule/lib/datetime";
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
    names: coupleTitle(invitation, lang),
    date: formatDate(invitation.mainDate, lang),
    coverUrl: coverKey ? mediaUrl(coverKey) : null,
    colors: { bg: vars["--bg"], text: vars["--text"], accent: vars["--primary"] },
  };
}
