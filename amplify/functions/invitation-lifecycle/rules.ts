// Mirrors src/InvitationModule/lib/lifecycle.js (Lambdas can't import src/); rules.test.ts uses the same cases.
export const PURGE_DAYS = 30;
export const OFFLINE_AFTER_DAYS = 7;
export const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Row = { status?: string | null; offlineOn?: string | null; purgeAt?: string | null } | null | undefined;

/** Today's date in India, whatever the server's clock zone. */
export function todayIST(now: number = Date.now()): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, n: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A real calendar date in strict YYYY-MM-DD form: rejects 2027-02-31, 2027-13-01 and so on.
 * The one date check for this Lambda; invitation-publish/publish.ts keeps an identical copy.
 */
export function isIsoDate(d: unknown): d is string {
  if (typeof d !== "string" || !ISO_DATE.test(d)) return false;
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d;
}

type Dated = { mainDate?: unknown; events?: { date?: unknown }[] | null } | null | undefined;

/** Latest event date (or the wedding date) plus 7 days; null when the content has no date at all. */
export function defaultOfflineOn(content: Dated): string | null {
  const dates = [...(content?.events ?? []).map((e) => e?.date), content?.mainDate].filter(isIsoDate);
  if (dates.length === 0) return null;
  return addDays(dates.sort().at(-1)!, OFFLINE_AFTER_DAYS);
}

/** Invitation content as stored: AWSJSON may be a map, a JSON string or a double-encoded one. Null if not an object. */
export function asContent(value: unknown): Record<string, any> | null {
  let v = value;
  for (let pass = 0; pass < 2 && typeof v === "string"; pass++) {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : null;
}

export function isOfflineDue(row: Row, now: number = Date.now()): boolean {
  return row?.status === "published" && isIsoDate(row.offlineOn) && row.offlineOn <= todayIST(now);
}

export function isEraseDue(row: Row, now: number = Date.now()): boolean {
  if (row?.status !== "offline" && row?.status !== "deleted") return false;
  const at = Date.parse(row.purgeAt ?? "");
  return Number.isFinite(at) && at <= now;
}
