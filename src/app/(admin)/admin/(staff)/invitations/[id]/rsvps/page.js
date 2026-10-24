import { notFound } from "next/navigation";
import { requireStaff } from "@/AdminModule/auth/server";
import { getInvitation } from "@/AdminModule/invitations/data";
import { listRsvps, regenerateFamilyTokenRecord } from "@/AdminModule/rsvps/data";
import {
  listRsvpsAction, markRsvpsSeenAction, newFamilyLinkAction, removeRsvpAction, saveRsvpAction,
} from "@/AdminModule/rsvps/actions";
import RsvpPage from "@/AdminModule/rsvps/RsvpPage";
import { indexFields } from "@/InvitationModule/lib/indexFields";

export const metadata = { title: "RSVPs · Baba Saab Admin" };

const ROW_FIELDS = ["rsvpKey", "phoneKey", "name", "phone", "attending", "guestCount", "eventIds", "meal", "message", "source", "createdAt", "updatedAt"];
// Model rows can carry non-serialisable extras; the client gets plain fields only.
const plainRow = (r) => Object.fromEntries(ROW_FIELDS.map((k) => [k, r[k] ?? null]));

export default async function RsvpsPage({ params }) {
  await requireStaff();
  const invitation = await getInvitation(params.id);
  if (!invitation) notFound();

  let familyToken = invitation.familyToken ?? null;
  // The family link is made the first time staff open this page (like the preview link for older invitations).
  // The record call, not the action: an action would revalidate during render.
  if (!familyToken) {
    const { data } = await regenerateFamilyTokenRecord(invitation.id).catch((err) => {
      console.error("regenerateFamilyToken failed", err);
      return { data: null };
    });
    familyToken = data?.familyToken ?? null;
  }

  let rows = null;
  try {
    rows = (await listRsvps(invitation.id)).map(plainRow);
  } catch (err) {
    console.error("listRsvps failed", err);
  }

  const content = invitation.content ?? {};
  return (
    <RsvpPage
      invitation={{
        id: invitation.id,
        slug: invitation.slug ?? null,
        title: indexFields(content).coupleNames,
        language: content.language ?? "en",
        events: content.events ?? [],
        familyToken,
      }}
      initialRows={rows}
      actions={{ listRsvpsAction, saveRsvpAction, removeRsvpAction, newFamilyLinkAction, markRsvpsSeenAction }}
    />
  );
}
