export const INVITATION_PREFIX = "invitations/";
export const LIBRARY_PREFIX = "music-library/";

export const invitationFolder = (id) => `${INVITATION_PREFIX}${id}/`;

// Plain S3 keys only. Anything a browser could normalise into a different path ("..", "//") is refused.
const SAFE_KEY = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

export function isSafeKey(key) {
  return typeof key === "string" && SAFE_KEY.test(key) && !key.split("/").some((part) => part === "." || part === "..");
}

/** Every file an invitation draft points at, with where it is used. */
export function mediaKeys(draft) {
  const found = [];
  const add = (field, key) => {
    if (typeof key === "string" && key) found.push({ field, key });
  };
  add("media.coverKey", draft?.media?.coverKey);
  add("couple.bride.photoKey", draft?.couple?.bride?.photoKey);
  add("couple.groom.photoKey", draft?.couple?.groom?.photoKey);
  (draft?.media?.gallery ?? []).forEach((item, i) => add(`media.gallery.${i}.key`, item?.key));
  add("media.music.key", draft?.media?.music?.key);
  add("media.film.key", draft?.media?.film?.key);
  return found;
}

/** Keys that don't belong to this invitation (or, for library music, to the library). */
export function foreignMediaKeys(draft, invitationId) {
  const folder = invitationFolder(invitationId);
  const libraryMusic = draft?.media?.music?.type === "library";
  return mediaKeys(draft)
    .filter(({ field, key }) => {
      if (!isSafeKey(key)) return true;
      const allowed = field === "media.music.key" && libraryMusic ? LIBRARY_PREFIX : folder;
      return !key.startsWith(allowed);
    })
    .map(({ key }) => key);
}

/** This invitation's own files that `before` used and `after` no longer does — safe to delete once `after` is saved. */
export function removedMediaKeys(before, after, invitationId) {
  const folder = invitationFolder(invitationId);
  const kept = new Set(mediaKeys(after).map(({ key }) => key));
  const previous = new Set(mediaKeys(before).map(({ key }) => key));
  return [...previous].filter((key) => key.startsWith(folder) && isSafeKey(key) && !kept.has(key));
}
