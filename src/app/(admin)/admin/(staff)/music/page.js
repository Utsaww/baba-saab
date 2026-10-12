import { requireStaff } from "@/AdminModule/auth/server";
import { listInvitations } from "@/AdminModule/invitations/data";
import { createMusicTrackAction, deleteMusicTrackAction, renameMusicTrackAction } from "@/AdminModule/music/actions";
import { listMusicTracks } from "@/AdminModule/music/data";
import { usageByTrack } from "@/AdminModule/music/library";
import MusicLibrary from "@/AdminModule/music/MusicLibrary";

export const metadata = { title: "Music · Baba Saab Admin" };

export default async function MusicPage() {
  await requireStaff();
  let tracks = null;
  let usage = {};
  try {
    const [allTracks, invitations] = await Promise.all([listMusicTracks(), listInvitations()]);
    tracks = allTracks;
    usage = usageByTrack(invitations);
  } catch (err) {
    console.error("Music Library failed to load", err);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Music Library</h1>
      <p className="mt-1 text-stone-600">Songs every invitation can use as background music.</p>
      {tracks ? (
        <MusicLibrary tracks={tracks} usage={usage} createAction={createMusicTrackAction} renameAction={renameMusicTrackAction} deleteAction={deleteMusicTrackAction} />
      ) : (
        <p role="alert" className="mt-6 text-sm text-red-700">
          Couldn&apos;t load the Music Library. Refresh the page to try again.
        </p>
      )}
    </div>
  );
}
