import { cache } from "react";
import { generateServerClientUsingReqRes } from "@aws-amplify/adapter-nextjs/data";
import { outputs, runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { parseAwsJson } from "@/AdminModule/invitations/content";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { parseInvitation } from "@/InvitationModule/schema/invitation";
import { previewInvitation } from "@/InvitationModule/lib/preview";
import { getTemplate } from "@/InvitationModule/templates/registry";

// Guests have no login: the identity pool's guest role may call publicInvitation and nothing else.
const client = generateServerClientUsingReqRes({ config: outputs, authMode: "identityPool" });

export async function loadPublicInvitation(slug, previewToken) {
  const args = typeof previewToken === "string" && previewToken ? { slug, previewToken } : { slug };
  const { data, errors } = await runWithAmplifyServerContext({
    nextServerContext: null,
    operation: (ctx) => client.queries.publicInvitation(ctx, args),
  });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data) return null;

  // Content may arrive as an object or as (double-encoded) JSON; anything else is a fault.
  const content = parseAwsJson(data.content);
  const template = getTemplate(data.templateId);
  if (!template) return null;
  if (data.mode === "preview") {
    return { mode: "preview", invitation: previewInvitation(cleanDraft(content).draft, template).invitation };
  }
  const invitation = parseInvitation({ ...content, templateId: data.templateId });
  // Replies go to the family's WhatsApp. Publishing requires the number, but an older live copy may lack it:
  // then there is nowhere to reply to, so the RSVP section is hidden.
  if (invitation.rsvp.enabled && !invitation.hosts.contactPhone?.trim()) {
    return { mode: "live", invitation: { ...invitation, rsvp: { ...invitation.rsvp, enabled: false } } };
  }
  return { mode: "live", invitation };
}

/** One lookup per request, shared by generateMetadata and the page. */
export const getPublicInvitation = cache(loadPublicInvitation);
