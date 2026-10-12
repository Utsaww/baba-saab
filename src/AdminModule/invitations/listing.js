const digits = (s) => s.replace(/\D/g, "");

export function filterInvitations(rows, { q = "", status = "all" } = {}) {
  const query = q.trim().toLowerCase();
  const queryDigits = digits(query);
  // A query that is mostly a phone number is matched on digits alone, however it was typed.
  const phoneSearch = queryDigits.length >= 5 && queryDigits.length >= query.replace(/\s/g, "").length - 3;
  const terms = query.split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    const text = (row.searchText ?? "").toLowerCase();
    if (phoneSearch) return digits(text).includes(queryDigits);
    return terms.every((term) => text.includes(term));
  });
}

export function sortByRecent(rows) {
  return [...rows].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const olderDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatEdited(iso, now) {
  const elapsed = now - Date.parse(iso);
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} days ago`;
  return olderDate.format(new Date(iso));
}
