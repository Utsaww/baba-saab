import { istInstant } from "./datetime";
import { textFor } from "./i18n";
import { coupleTitle } from "./names";
import { UI } from "./ui-strings";

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

const MEAL_LABEL = { veg: UI.mealVeg, nonveg: UI.mealNonVeg, jain: UI.mealJain };

// The family's number as wa.me wants it: country code and number, digits only.
// Spaces, dashes, dots and brackets are dropped, as is a leading "+" or international "00";
// a local "0" before a 10-digit Indian number goes, and a 10-digit number gets India's 91.
// Anything else (letters, stray symbols) gives "".
export function whatsappDigits(phone) {
  let digits = String(phone ?? "").trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return "";
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? `91${digits}` : digits;
}

// A number WhatsApp can open a chat with: 11 to 15 digits once normalised.
export function isWhatsappNumber(phone) {
  const digits = whatsappDigits(phone);
  return digits.length >= 11 && digits.length <= 15;
}

// Guests reply on WhatsApp only when staff opted in to it in step 7. Content switched on before
// WhatsApp replies existed (`enabled` without `channel`) stays hidden until staff turn it on again.
export function whatsappRsvpOn(rsvp) {
  return Boolean(rsvp?.enabled && rsvp?.channel === "whatsapp");
}

// The reply the guest sends, one "Label: value" per line, leaving out anything empty.
// Bilingual invitations use English labels, which every family member can read.
export function rsvpMessage(inv, values, lang) {
  const l = lang === "hi" ? "hi" : "en";
  const label = (v) => textFor(v, l);
  const events = (values.eventIds ?? [])
    .map((id) => inv.events?.find((e) => e.id === id))
    .filter(Boolean)
    .map((e) => textFor(e.name, l))
    .filter(Boolean);
  const lines = [
    `${label(UI.rsvp)} — ${coupleTitle(inv, l)}`,
    [label(UI.name), values.name],
    [label(UI.rsvpMessage.attending), UI[values.attending] && label(UI[values.attending])],
    [label(UI.rsvpMessage.guests), values.guestCount],
    [label(UI.rsvpMessage.events), events.join(", ")],
    [label(UI.rsvpMessage.meal), MEAL_LABEL[values.meal] && label(MEAL_LABEL[values.meal])],
    [label(UI.phone), values.phone],
    [label(UI.rsvpMessage.message), values.message],
  ];
  return lines
    .map((line) => {
      if (typeof line === "string") return line;
      const [name, value] = line;
      const text = value === undefined || value === null ? "" : String(value).trim();
      return text ? `${name}: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

// A WhatsApp chat with the family, the reply already typed. Null without a family number.
export function whatsappRsvpUrl(inv, values, lang) {
  if (!isWhatsappNumber(inv.hosts?.contactPhone)) return null;
  const digits = whatsappDigits(inv.hosts.contactPhone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(rsvpMessage(inv, values, lang))}`;
}
