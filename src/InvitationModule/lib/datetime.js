const TIME_ZONE = "Asia/Kolkata";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isValid = (d) => !Number.isNaN(d.getTime());
const locale = (lang) => (lang === "hi" ? "hi-IN" : "en-IN");

// All invitation dates and times are Indian Standard Time.
export function istInstant(date, time) {
  if (!DATE_RE.test(date ?? "")) return new Date(NaN);
  return new Date(`${date}T${time || "00:00"}:00+05:30`);
}

export function formatDate(date, lang = "en") {
  const d = istInstant(date);
  if (!isValid(d)) return "";
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function formatTime(time, lang = "en") {
  if (!TIME_RE.test(time ?? "")) return "";
  return new Intl.DateTimeFormat(locale(lang), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(istInstant("2000-01-01", time));
}

export function formatDots(date) {
  const m = DATE_RE.exec(date ?? "");
  return m ? `${m[3]} · ${m[2]} · ${m[1]}` : "";
}

// Month, day and year as separate strings (e.g. Temple's three scratch cards). English uses the
// short month ("Nov"); Hindi the full name ("नवंबर"), since its short forms ("नव॰") read poorly.
export function dateParts(date, lang = "en") {
  const m = DATE_RE.exec(date ?? "");
  if (!m) return null;
  const hi = lang === "hi";
  const month = new Intl.DateTimeFormat(locale(hi ? "hi" : "en"), { month: hi ? "long" : "short", timeZone: TIME_ZONE }).format(istInstant(date, "12:00"));
  return { month, day: String(Number(m[3])), year: m[1] };
}
