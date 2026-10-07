const GENERIC = "Something went wrong. Please try again.";
export const OFFLINE_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

const STATUS_LABELS = {
  invited: "Invited · hasn't signed in yet",
  active: "Active",
  disabled: "Disabled",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

const addedDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatAddedDate(iso) {
  return addedDate.format(new Date(iso));
}

/** Turns Amplify Data `errors` into one sentence for staff. */
export function errorMessage(errors) {
  const first = errors?.[0];
  if (!first) return GENERIC;
  if (first.errorType === "Unauthorized") return "Only the owner can manage staff.";
  // Only messages our Lambda wrote for staff are safe to show; AppSync/runtime errors are not.
  if (first.errorType === "Lambda:Unhandled" && first.message) return first.message;
  return GENERIC;
}
