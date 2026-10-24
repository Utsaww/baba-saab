import { textFor } from "./i18n";
import { whatsappDigits } from "./rsvp";

export function nameKey(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function rsvpKeyFor({ phone, name }) {
  const phoneKey = whatsappDigits(phone);
  const nk = nameKey(name);
  return { phoneKey, nameKey: nk, rsvpKey: `${phoneKey}#${nk}` };
}

const peopleOf = (r) => r.guestCount ?? 1;

export function summarize(rows, events) {
  const out = { coming: 0, notComing: 0, maybe: 0, people: 0, perEvent: {} };
  for (const e of events ?? []) out.perEvent[e.id] = 0;
  for (const r of rows ?? []) {
    if (r.attending === "no") out.notComing += 1;
    else if (r.attending === "maybe") out.maybe += 1;
    else if (r.attending === "yes") {
      out.coming += 1;
      const n = peopleOf(r);
      out.people += n;
      const ids = r.eventIds?.length ? r.eventIds : Object.keys(out.perEvent);
      for (const id of ids) if (id in out.perEvent) out.perEvent[id] += n;
    }
  }
  return out;
}

const isStaff = (r) => String(r.rsvpKey ?? "").startsWith("staff#");
const phoneKeyOf = (r) => r.phoneKey ?? String(r.rsvpKey ?? "").split("#")[0];

export function familyMarks(rows) {
  const byPhone = new Map();
  for (const r of rows ?? []) {
    if (!r.rsvpKey || isStaff(r)) continue;
    const k = phoneKeyOf(r);
    if (!k) continue;
    byPhone.set(k, [...(byPhone.get(k) ?? []), r]);
  }
  const marks = new Map();
  for (const group of byPhone.values()) {
    if (group.length < 2) continue;
    for (const r of group) {
      marks.set(r.rsvpKey, group.filter((o) => o !== r).map((o) => o.name));
    }
  }
  return marks;
}

export function familyNote(names) {
  return `Same family as ${names.join(", ")} — replied from the same phone number`;
}

export function filterRows(rows, { q, eventId, attending } = {}) {
  const text = String(q ?? "").trim().toLowerCase();
  const digits = whatsappDigits(text) || text.replace(/\D/g, "");
  return (rows ?? [])
    .filter((r) => {
      if (text) {
        const byName = String(r.name ?? "").toLowerCase().includes(text);
        const byPhone = digits && (r.phoneKey ?? whatsappDigits(r.phone)).includes(digits);
        if (!byName && !byPhone) return false;
      }
      if (eventId && r.eventIds?.length && !r.eventIds.includes(eventId)) return false;
      if (attending && attending !== "all" && r.attending !== attending) return false;
      return true;
    })
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
}

const HEADER = ["Name", "Phone", "Attending", "People", "Events", "Meal", "Message", "Replied", "Source"];

// Cells that spreadsheets would run as formulas get a leading quote; `asText` forces text (phone numbers).
function cell(v, asText = false) {
  let s = String(v ?? "");
  if (s && (asText || /^[=+\-@\t\r]/.test(s))) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const ATTENDING = {
  en: { yes: "Coming", no: "Not coming", maybe: "Maybe" },
  hi: { yes: "आ रहे हैं", no: "नहीं आ रहे", maybe: "शायद" },
};
const ALL_EVENTS = { en: "All events", hi: "सभी कार्यक्रम" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const IST = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit", hour12: true,
});

// "24 Oct 2026, 10:30 pm" in IST; "" when the value is not a date.
function repliedAt(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(IST.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day} ${MONTHS[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute} ${String(p.dayPeriod).toLowerCase()}`;
}

export function toCsv(rows, events, lang) {
  const l = lang === "hi" ? "hi" : "en";
  const lines = [HEADER.map((h) => cell(h)).join(",")];
  for (const r of rows ?? []) {
    const names = (r.eventIds ?? [])
      .map((id) => (events ?? []).find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => textFor(e.name, l))
      .filter(Boolean)
      .join("; ");
    lines.push(
      [
        cell(r.name),
        cell(r.phone, true),
        cell(ATTENDING[l][r.attending] ?? r.attending),
        cell(r.attending === "yes" ? peopleOf(r) : ""),
        cell(names || ALL_EVENTS[l]),
        cell(r.meal),
        cell(r.message),
        cell(repliedAt(r.updatedAt)),
        cell(r.source),
      ].join(","),
    );
  }
  return String.fromCharCode(0xfeff) + lines.join("\r\n") + "\r\n";
}
