import { liveState } from "./liveState";

export const PURGE_DAYS = 30;
export const OFFLINE_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const STATUS_LABEL = { draft: "Draft", live: "Live", changes: "Changes not live", offline: "Offline", deleted: "Deleted" };

/** Today's date in India, whatever the server's clock zone. */
export function todayIST(now = Date.now()) {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(isoDate, n) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Latest event date (or the wedding date) plus 7 days; null when the draft has no date at all. */
export function defaultOfflineOn(content) {
  const dates = [...(content?.events ?? []).map((e) => e?.date), content?.mainDate].filter((d) => ISO_DATE.test(d ?? ""));
  if (dates.length === 0) return null;
  return addDays(dates.sort().at(-1), OFFLINE_AFTER_DAYS);
}

export function isOfflineDue(row, now = Date.now()) {
  return row?.status === "published" && ISO_DATE.test(row.offlineOn ?? "") && row.offlineOn <= todayIST(now);
}

export function isEraseDue(row, now = Date.now()) {
  if (row?.status !== "offline" && row?.status !== "deleted") return false;
  const at = Date.parse(row.purgeAt ?? "");
  return Number.isFinite(at) && at <= now;
}

export function statusBadge(row) {
  if (row.status === "offline" || row.status === "deleted") return row.status;
  return liveState(row);
}

/** Counts for the notices above the invitations list. */
export function listNotices(rows, now = Date.now()) {
  const weekAhead = addDays(todayIST(now), OFFLINE_AFTER_DAYS);
  let goingOffline = 0;
  let erasingSoon = 0;
  for (const row of rows) {
    if (row.status === "published" && ISO_DATE.test(row.offlineOn ?? "") && row.offlineOn <= weekAhead) goingOffline += 1;
    if (isEraseDue(row, now + DAY_MS)) erasingSoon += 1;
  }
  return { goingOffline, erasingSoon };
}
