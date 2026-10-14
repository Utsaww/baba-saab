export const PUBLISH_FAILED = "Couldn't publish. Check your connection and try again.";

const MESSAGES = {
  SlugTaken: "That link name was just taken — try another.",
  InvalidSlug: "That link name isn't allowed.",
  NotDraft: "This invitation is already published — reload the page.",
  NotPublished: "Publish the invitation first.",
  NoSlug: "Choose a link name first.",
  NotFound: "That invitation no longer exists.",
};

/** Turns a GraphQL error list from invitation-publish into what the editor shows. */
export function publishFailure(errors) {
  const type = errors?.[0]?.errorType;
  if (type === "VersionConflict") return { ok: false, conflict: true };
  return { ok: false, message: MESSAGES[type] ?? PUBLISH_FAILED };
}
