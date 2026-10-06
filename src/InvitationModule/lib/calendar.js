import { istInstant } from "./datetime";

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dayStamp = (isoDate) => isoDate.replace(/-/g, "");

function nextDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const escapeIcs = (s = "") =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function eventWindow({ date, time }) {
  const start = istInstant(date, time);
  if (Number.isNaN(start.getTime())) return null;
  if (!time) return { allDay: true, start: dayStamp(date), end: dayStamp(nextDay(date)) };
  return { allDay: false, start: utcStamp(start), end: utcStamp(new Date(start.getTime() + DEFAULT_DURATION_MS)) };
}

export function googleCalendarUrl(entry) {
  const w = eventWindow(entry);
  if (!w) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${w.start}/${w.end}`,
    details: entry.details ?? "",
    location: entry.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(entries, { uidPrefix = "invite", now = new Date() } = {}) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Baba Saab Events//Invitations//EN", "CALSCALE:GREGORIAN"];
  entries.forEach((entry, i) => {
    const w = eventWindow(entry);
    if (!w) return;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.uid ?? `${uidPrefix}-${i}`}@babasaab`,
      `DTSTAMP:${utcStamp(now)}`,
      w.allDay ? `DTSTART;VALUE=DATE:${w.start}` : `DTSTART:${w.start}`,
      w.allDay ? `DTEND;VALUE=DATE:${w.end}` : `DTEND:${w.end}`,
      `SUMMARY:${escapeIcs(entry.title)}`,
      `LOCATION:${escapeIcs(entry.location)}`,
      `DESCRIPTION:${escapeIcs(entry.details)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
