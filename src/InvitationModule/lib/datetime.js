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

const DASH = "–";
const MAX_RANGE_DAYS = 7;
export const END_DATE_ERROR = `Pick a date 1${DASH}${MAX_RANGE_DAYS} days after the wedding date`;

const dayNumber = (date) => {
  const m = DATE_RE.exec(date ?? "");
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN;
};

// A multi-day wedding's end date counts only if it falls 1 to 7 days after the first day.
export function validEndDate(start, end) {
  const gap = dayNumber(end) - dayNumber(start);
  return gap >= 1 && gap <= MAX_RANGE_DAYS;
}

// The field error for an end date that is set but out of range; undefined when fine or absent.
export function endDateError(start, end) {
  if (!end) return undefined;
  return validEndDate(start, end) ? undefined : END_DATE_ERROR;
}

// dateParts for a wedding that may run over several days: "11–12", "Nov–Dec", "2026–27".
// An absent or invalid end date gives the single-day parts.
export function dateRangeParts(start, end, lang = "en") {
  const a = dateParts(start, lang);
  if (!a) return null;
  if (!validEndDate(start, end)) return { month: a.month, date: a.day, year: a.year };
  const b = dateParts(end, lang);
  return {
    month: b.month === a.month ? a.month : `${a.month}${DASH}${b.month}`,
    date: `${a.day}${DASH}${b.day}`,
    year: b.year === a.year ? a.year : `${a.year}${DASH}${b.year.slice(2)}`,
  };
}

const pieces = (date, lang) => {
  const out = {};
  for (const p of new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).formatToParts(istInstant(date))) {
    out[p.type] = p.value;
  }
  return out;
};

// The long date for a range, e.g. "Friday 11 – Saturday 12 December 2026". The month and year are
// written once when shared, and on each side when not. Without a valid end, it is formatDate.
export function formatDateRange(start, end, lang = "en") {
  if (!validEndDate(start, end)) return formatDate(start, lang);
  const a = pieces(start, lang);
  const b = pieces(end, lang);
  const sameYear = a.year === b.year;
  const sameMonth = sameYear && a.month === b.month;
  const left = [a.weekday, a.day, !sameMonth && a.month, !sameYear && a.year].filter(Boolean).join(" ");
  const right = [b.weekday, b.day, b.month, b.year].join(" ");
  return `${left} ${DASH} ${right}`;
}

// formatDots for a range: "11–12 · 12 · 2026", writing the month and year once when shared.
export function formatDotsRange(start, end) {
  if (!validEndDate(start, end)) return formatDots(start);
  const [y1, m1, d1] = start.split("-");
  const [y2, m2, d2] = end.split("-");
  if (y1 !== y2) return `${formatDots(start)} ${DASH} ${formatDots(end)}`;
  if (m1 !== m2) return `${d1} · ${m1} ${DASH} ${d2} · ${m2} · ${y1}`;
  return `${d1}${DASH}${d2} · ${m1} · ${y1}`;
}
