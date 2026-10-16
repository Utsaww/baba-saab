import { notFound } from "next/navigation";
import { requireStaff } from "@/AdminModule/auth/server";
import { saveInvitationAction } from "@/AdminModule/invitations/actions";
import { getInvitation, regenerateTokenRecord } from "@/AdminModule/invitations/data";
import { checkSlugAction, newPreviewLinkAction, publishAction, setSlugAction, updateLiveAction } from "@/AdminModule/invitations/publishActions";
import {
  deleteInvitationAction, eraseNowAction, putOnlineAction, restoreInvitationAction, setOfflineOnAction, takeOfflineAction,
} from "@/AdminModule/invitations/lifecycleActions";
import { listMusicTracks } from "@/AdminModule/music/data";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";
import EditorShell from "@/AdminModule/editor/EditorShell";
import { stepNumber } from "@/AdminModule/editor/stepNumber";

export const metadata = { title: "Edit invitation · Baba Saab Admin" };

export default async function EditInvitationPage({ params, searchParams }) {
  await requireStaff();
  const invitation = await getInvitation(params.id);
  if (!invitation) notFound();
  // Invitations created before Phase 3 have no preview code yet.
  if (!invitation.previewToken) {
    const { data } = await regenerateTokenRecord(invitation.id).catch(() => ({ data: null }));
    invitation.previewToken = data?.previewToken ?? null;
  }

  let musicTracks = [];
  let musicTracksError = false;
  try {
    musicTracks = (await listMusicTracks()).map(({ id, name, key, durationSec }) => ({ id, name, key, durationSec }));
  } catch (err) {
    musicTracksError = true;
    console.error("listMusicTracks failed", err);
  }
  return (
    <EditorShell
      invitation={invitation}
      initialStep={stepNumber(searchParams?.step)}
      templates={templateChoices()}
      saveAction={saveInvitationAction}
      publishActions={{ checkSlugAction, setSlugAction, newPreviewLinkAction, publishAction, updateLiveAction }}
      musicTracks={musicTracks}
      musicTracksError={musicTracksError}
    />
  );
}
