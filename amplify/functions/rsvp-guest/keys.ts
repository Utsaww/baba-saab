// Lambdas can't import src/, so the few RSVP rules the guest function enforces are copied here.
// Keep each one identical to its source; keys.test.ts repeats the source's test cases.

const PHONE_RE = /^\+?\d[\d\s-]{8,14}\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LAST_MS_OF_MINUTE = 59_999;

type Rsvp = { enabled?: boolean; channel?: string; deadline?: string; askGuestCount?: boolean; askMeal?: boolean } | null | undefined;

// Copy of whatsappDigits in src/InvitationModule/lib/rsvp.js.
export function whatsappDigits(phone: unknown): string {
  let digits = String(phone ?? "").trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return "";
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? `91${digits}` : digits;
}

// Copy of isWhatsappNumber in src/InvitationModule/lib/rsvp.js.
export function isWhatsappNumber(phone: unknown): boolean {
  const digits = whatsappDigits(phone);
  return digits.length >= 11 && digits.length <= 15;
}

// Copy of whatsappRsvpOn in src/InvitationModule/lib/rsvp.js.
export function whatsappRsvpOn(rsvp: Rsvp): boolean {
  return Boolean(rsvp?.enabled && rsvp?.channel === "whatsapp");
}

// Copy of isRsvpClosed in src/InvitationModule/lib/rsvp.js (with istInstant from lib/datetime.js inlined):
// RSVPs stay open through the whole deadline day in IST.
export function isRsvpClosed(rsvp: Rsvp, now: number = Date.now()): boolean {
  if (!rsvp?.deadline) return false;
  if (!DATE_RE.test(rsvp.deadline)) return false;
  const end = new Date(`${rsvp.deadline}T23:59:00+05:30`).getTime() + LAST_MS_OF_MINUTE;
  if (Number.isNaN(end)) return false;
  return now > end;
}

// Copy of validateRsvpInput in src/InvitationModule/lib/rsvp.js.
export function validateRsvpInput(input: Record<string, any>, { askGuestCount }: { askGuestCount?: boolean }) {
  const errors: Record<string, string> = {};
  if (!input.name?.trim()) errors.name = "required";
  if (!PHONE_RE.test(input.phone?.trim() ?? "")) errors.phone = "phone";
  if (!["yes", "no", "maybe"].includes(input.attending)) errors.attending = "required";
  if (askGuestCount && input.attending !== "no") {
    const n = Number(input.guestCount);
    if (!Number.isInteger(n) || n < 1 || n > 20) errors.guestCount = "count";
  }
  return errors;
}

// Copy of nameKey in src/InvitationModule/lib/rsvpList.js.
export function nameKey(name: unknown): string {
  return String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Copy of rsvpKeyFor in src/InvitationModule/lib/rsvpList.js: same phone + same name is the same guest.
export function rsvpKeyFor({ phone, name }: { phone: unknown; name: unknown }) {
  const phoneKey = whatsappDigits(phone);
  const nk = nameKey(name);
  return { phoneKey, nameKey: nk, rsvpKey: `${phoneKey}#${nk}` };
}

// Copy of asContent in amplify/functions/invitation-lifecycle/rules.ts: AWSJSON may be a map, a JSON string or a
// double-encoded one. Null if not an object.
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

// Same rule as lookup.ts in invitation-public: link names are lower-case words joined by single dashes.
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function isSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length >= 3 && slug.length <= 60 && SLUG.test(slug);
}
