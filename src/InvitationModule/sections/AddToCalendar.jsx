"use client";
import { buildIcs, googleCalendarUrl } from "../lib/calendar";
import { UI } from "../lib/ui-strings";
import T from "./Text";

const REVOKE_AFTER_MS = 1000;

export default function AddToCalendar({ entry, lang, s = {} }) {
  const href = googleCalendarUrl(entry);
  if (!href) return null;

  function downloadIcs() {
    const blob = new Blob([buildIcs([entry])], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.title.replace(/[^\w\- ]+/g, "").trim() || "event"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
  }

  return (
    <div className={s.calLinks}>
      <a href={href} target="_blank" rel="noopener noreferrer" className={s.calLink}>
        <T v={UI.addToCalendar} lang={lang} />
      </a>
      <button type="button" className={s.calLink} onClick={downloadIcs}>
        <T v={UI.downloadIcs} lang={lang} />
      </button>
    </div>
  );
}
