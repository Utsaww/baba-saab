import { istInstant } from "./datetime";

const PHONE_RE = /^\+?\d[\d\s-]{8,14}\d$/;
const LAST_MS_OF_MINUTE = 59_999;

// RSVPs stay open through the whole deadline day in IST.
export function isRsvpClosed(rsvp, now = Date.now()) {
  if (!rsvp?.deadline) return false;
  const end = istInstant(rsvp.deadline, "23:59").getTime() + LAST_MS_OF_MINUTE;
  if (Number.isNaN(end)) return false;
  return now > end;
}

export function validateRsvpInput(input, { askGuestCount }) {
  const errors = {};
  if (!input.name?.trim()) errors.name = "required";
  if (!PHONE_RE.test(input.phone?.trim() ?? "")) errors.phone = "phone";
  if (!["yes", "no", "maybe"].includes(input.attending)) errors.attending = "required";
  if (askGuestCount && input.attending !== "no") {
    const n = Number(input.guestCount);
    if (!Number.isInteger(n) || n < 1 || n > 20) errors.guestCount = "count";
  }
  return errors;
}
