import { cleanDraft } from "@/InvitationModule/schema/draft";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { foreignMediaKeys } from "@/InvitationModule/lib/mediaKeys";

export const FOREIGN_FILE = "That file doesn't belong to this invitation. Remove it and upload again.";
export const MISSING_TRACK = "That song is no longer in the Music Library — choose another.";
export const SAVE_FAILED = "Couldn't save. Check your connection and try again.";

/** Amplify returns AWSJSON as a string; accept either form. */
export function parseContent(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function prepareSave({ id, expectedVersion, content, libraryTrack = null }) {
  if (typeof id !== "string" || !id || !Number.isInteger(expectedVersion)) {
    return { ok: false, message: "That save request wasn't valid. Reload the page." };
  }
  const { draft } = cleanDraft(content);
  if (!draft) return { ok: false, message: "Choose a template and palette before saving." };

  const music = draft.media?.music;
  if (music?.type === "library") {
    if (!libraryTrack || libraryTrack.id !== music.trackId) return { ok: false, message: MISSING_TRACK };
    // Always the library's own file, never a copy the browser sent.
    music.key = libraryTrack.key;
  }
  if (foreignMediaKeys(draft, id).length > 0) return { ok: false, message: FOREIGN_FILE };

  return { ok: true, content: JSON.stringify(draft), fields: indexFields(draft) };
}

export function saveResult({ data, errors }) {
  if (errors?.length) {
    if (errors[0].errorType === "VersionConflict") return { ok: false, conflict: true };
    return { ok: false, message: SAVE_FAILED };
  }
  if (!data) return { ok: false, message: SAVE_FAILED };
  return { ok: true, version: data.version, savedAt: data.updatedAt };
}
