"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { listInvitations } from "@/AdminModule/invitations/data";
import { createMusicTrackRecord, deleteMusicTrackRecord, getMusicTrack, renameMusicTrackRecord } from "./data";
import { isLibraryKey, usageByTrack, usedByMessage, validateTrackName } from "./library";

const FAILED = "Something went wrong. Please try again.";

export async function createMusicTrackAction({ name, key, durationSec }) {
  const session = await requireStaff();
  const nameError = validateTrackName(name);
  if (nameError) return { ok: false, message: nameError };
  if (!isLibraryKey(key)) return { ok: false, message: "That file isn't in the Music Library. Upload it again." };
  const seconds = Number.isInteger(durationSec) && durationSec >= 0 ? durationSec : null;
  try {
    const track = await createMusicTrackRecord({ name: name.trim(), key, durationSec: seconds, email: session.email });
    revalidatePath("/admin/music");
    return { ok: true, track };
  } catch (err) {
    console.error("createMusicTrack failed", err);
    return { ok: false, message: FAILED };
  }
}

export async function renameMusicTrackAction({ id, name }) {
  await requireStaff();
  const nameError = validateTrackName(name);
  if (nameError) return { ok: false, message: nameError };
  try {
    await renameMusicTrackRecord(id, name.trim());
    revalidatePath("/admin/music");
    return { ok: true };
  } catch (err) {
    console.error("renameMusicTrack failed", err);
    return { ok: false, message: FAILED };
  }
}

export async function deleteMusicTrackAction({ id }) {
  await requireStaff();
  try {
    // Checked again here, not just on the page: an invitation may have picked this song since the page loaded.
    const users = usageByTrack(await listInvitations())[id] ?? [];
    if (users.length > 0) return { ok: false, message: usedByMessage(users.length) };
    const track = await getMusicTrack(id);
    if (!track) {
      revalidatePath("/admin/music");
      return { ok: true, key: null };
    }
    await deleteMusicTrackRecord(id);
    revalidatePath("/admin/music");
    return { ok: true, key: track.key };
  } catch (err) {
    console.error("deleteMusicTrack failed", err);
    return { ok: false, message: FAILED };
  }
}
