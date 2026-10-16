export const PUBLISH_FAILED = "Couldn't publish. Check your connection and try again.";
export const SLUG_TAKEN = "That link name was just taken — try another.";

const MESSAGES = {
  SlugTaken: SLUG_TAKEN,
  InvalidSlug: "That link name isn't allowed.",
  NotDraft: "This invitation is already published — reload the page.",
  NotPublished: "Publish the invitation first.",
  NoSlug: "Choose a link name first.",
  NotFound: "That invitation no longer exists.",
  WrongStatus: "This invitation changed — reload the page.",
  BadDate: "Pick a date after today",
  BadConfirm: "That doesn't match — type it exactly as shown.",
};

/** Turns a GraphQL error list from invitation-publish into what the editor shows. */
export function publishFailure(errors) {
  const type = errors?.[0]?.errorType;
  if (type === "VersionConflict") return { ok: false, conflict: true };
  return { ok: false, message: MESSAGES[type] ?? PUBLISH_FAILED };
}
