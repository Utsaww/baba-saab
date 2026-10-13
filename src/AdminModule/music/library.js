import { isSafeKey, LIBRARY_PREFIX } from "@/InvitationModule/lib/mediaKeys";

export const MAX_TRACK_NAME = 80;

/** Couple names of the invitations using each library track. */
export function usageByTrack(rows) {
  const usage = {};
  for (const row of rows) {
    if (row.musicTrackId) (usage[row.musicTrackId] ??= []).push(row.coupleNames);
  }
  return usage;
}

export function trackNameFromFile(fileName) {
  return String(fileName ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function validateTrackName(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "Enter a name for the song.";
  if (trimmed.length > MAX_TRACK_NAME) return `Keep the name under ${MAX_TRACK_NAME} characters.`;
  return null;
}

export function usedByMessage(count) {
  return count === 1 ? "Used by 1 invitation — change its music first." : `Used by ${count} invitations — change their music first.`;
}

export function isLibraryKey(key) {
  return isSafeKey(key) && key.startsWith(LIBRARY_PREFIX) && key.endsWith(".mp3");
}
