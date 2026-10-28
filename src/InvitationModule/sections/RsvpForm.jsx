"use client";
import { useEffect, useRef, useState } from "react";
import { UI } from "../lib/ui-strings";
import { plainText } from "../lib/i18n";
import { validateRsvpInput } from "../lib/rsvp";
import T from "./Text";

const EMPTY = { name: "", phone: "", attending: "", guestCount: "1", eventIds: [], meal: "", message: "", website: "" };
const HONEYPOT_STYLE = { position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" };
const REMEMBERED = ["name", "phone", "guestCount", "meal", "message"];
const ATTENDING = ["yes", "no", "maybe"];

// The guest's last reply on this device. Storage can be missing or refused (private mode, full disk);
// then the form simply starts empty.
function loadReply(key, events) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!saved || typeof saved !== "object") return null;
    const values = { ...EMPTY };
    for (const field of REMEMBERED) if (typeof saved[field] === "string") values[field] = saved[field];
    if (ATTENDING.includes(saved.attending)) values.attending = saved.attending;
    const ids = new Set(events.map((e) => e.id));
    values.eventIds = Array.isArray(saved.eventIds) ? saved.eventIds.filter((id) => ids.has(id)) : [];
    return values;
  } catch {
    return null;
  }
}
function saveReply(key, values) {
  try {
    const { website: _ignored, ...reply } = values;
    localStorage.setItem(key, JSON.stringify(reply));
  } catch {
    // Not remembered on this device; the reply itself still goes out.
  }
}

// One try, plus one more after a server or network error. Rate limits and closed replies won't change on a retry.
// Each attempt gets 8s and the whole thing about 12s, so a slow connection never holds the guest on a blank tab for long.
const ATTEMPT_MS = 8000;
const BUDGET_MS = 12000;
const MIN_RETRY_MS = 1000;
async function attemptSave(save, reply) {
  let result = { ok: false, reason: "error" };
  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = BUDGET_MS - (Date.now() - started);
    if (attempt > 0 && left < MIN_RETRY_MS) break;
    try {
      result = (await save(reply, { timeoutMs: Math.min(ATTEMPT_MS, left) })) ?? result;
    } catch {
      result = { ok: false, reason: "error" };
    }
    if (result.ok || result.reason !== "error") break;
  }
  return result;
}

// Guests reply on WhatsApp: the form composes a message to the family's number and opens WhatsApp.
// Nothing is sent to Baba Saab. A fallback panel always follows, in case WhatsApp didn't open.
export default function RsvpForm({
  lang,
  events,
  askGuestCount,
  askMeal,
  closed,
  closedOnText,
  deadlineText,
  contactPhone,
  preview = false,
  storageKey,
  compose,
  save,
  s = {},
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [remembered, setRemembered] = useState(false);
  const [sent, setSent] = useState(null); // { url, message } of the last reply
  const [copied, setCopied] = useState(false);
  const [unsendable, setUnsendable] = useState(false); // the family's number can't be used
  const [saveState, setSaveState] = useState(null); // "saved" | "failed" once a live reply has been sent
  const [saving, setSaving] = useState(false);
  const [closedNow, setClosedNow] = useState(false); // the server says replies have closed
  const messageBox = useRef(null);
  const busy = useRef(false); // true from the tap until the save settles
  const closedNotice = useRef(null);

  // Read after mount so the server HTML never depends on this device.
  useEffect(() => {
    if (!storageKey) return;
    const saved = loadReply(storageKey, events);
    if (saved) {
      setValues(saved);
      setRemembered(true);
    }
    // Only on first mount: a live edit of the events list shouldn't wipe what the guest is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // The notice replaces the form, so focus would otherwise fall to the page.
  useEffect(() => {
    if (closedNow) closedNotice.current?.focus();
  }, [closedNow]);

  if (closed || closedNow) {
    return (
      <p className={s.rsvpClosed} role="status" ref={closedNotice} tabIndex={-1}>
        <T v={UI.rsvpClosed} lang={lang} /> {closedOnText}.{" "}
        {contactPhone && (
          <>
            <T v={UI.rsvpContact} lang={lang} /> <a href={`tel:${contactPhone}`}>{contactPhone}</a>
          </>
        )}
      </p>
    );
  }
  // Live pages hide the section upstream; this is the last guard.
  if (!contactPhone && !preview) return null;

  const attendingNow = values.attending !== "no";
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const toggleEvent = (id) =>
    setValues((v) => ({
      ...v,
      eventIds: v.eventIds.includes(id) ? v.eventIds.filter((x) => x !== id) : [...v.eventIds, id],
    }));
  const fieldError = (field) =>
    errors[field] ? <T as="span" v={UI.errors[errors[field]]} lang={lang} className={s.fieldError} /> : null;

  async function submit(e) {
    e.preventDefault();
    if (busy.current) return;
    const found = validateRsvpInput(values, { askGuestCount });
    setErrors(found);
    if (Object.keys(found).length) return;
    if (values.website) return; // a bot filled the hidden field
    const reply = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      attending: values.attending,
      guestCount: askGuestCount && attendingNow ? Number(values.guestCount) : undefined,
      eventIds: attendingNow ? values.eventIds : [],
      meal: askMeal && attendingNow ? values.meal || undefined : undefined,
      message: values.message.trim() || undefined,
    };
    const composed = compose?.(reply);
    setUnsendable(!composed);
    if (!composed) return;
    if (storageKey) saveReply(storageKey, values);
    setCopied(false);
    if (!save) {
      setSent(composed);
      // Called straight from the tap, so pop-up blockers allow it.
      window.open(composed.url, "_blank", "noopener,noreferrer");
      return;
    }
    busy.current = true;
    // Pop-up blockers only allow windows opened straight from the tap, not after the save has awaited.
    // So open a blank one now and point it at WhatsApp once the save has settled.
    const win = window.open("", "_blank");
    if (win) {
      try {
        win.opener = null;
      } catch {
        // Some browsers refuse; the blank window is still ours to navigate.
      }
    }
    setSaving(true);
    setSaveState(null);
    const result = await attemptSave(save, reply);
    busy.current = false;
    setSaving(false);
    if (result.reason === "closed") {
      try {
        win?.close();
      } catch {
        // Nothing more to do with it.
      }
      setClosedNow(true);
      return;
    }
    setSaveState(result.ok ? "saved" : "failed");
    setSent(composed);
    if (win) {
      try {
        win.location = composed.url;
      } catch {
        // The panel below still offers the link.
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(sent.message);
      setCopied(true);
      return;
    } catch {
      // No clipboard access (older browser, in-app browser, insecure context): select the text instead.
    }
    const box = messageBox.current;
    if (!box) return;
    box.focus();
    box.setSelectionRange(0, box.value.length);
    try {
      if (document.execCommand?.("copy")) setCopied(true);
    } catch {
      // The text stays selected for the guest to copy by hand.
    }
  }

  return (
    <>
      <div role="status" aria-live="polite">
        {saving && <T as="p" v={UI.rsvpSaving} lang={lang} className={s.rsvpNote} />}
        {!saving && saveState && (
          <T as="p" v={saveState === "saved" ? UI.rsvpSaved : UI.rsvpSaveFailed} lang={lang} className={s.rsvpNote} />
        )}
      </div>
      <form className={s.rsvpForm} onSubmit={submit} noValidate>
        {preview && <T as="p" v={UI.rsvpPreviewNote} lang={lang} className={s.rsvpNote} />}
        {remembered && <T as="p" v={UI.rsvpRemembered} lang={lang} className={s.rsvpNote} />}
        {deadlineText && (
          <p className={s.rsvpDeadline}>
            <T v={UI.rsvpBy} lang={lang} /> {deadlineText}
          </p>
        )}
        <label className={s.field}>
          <T v={UI.name} lang={lang} />
          <input name="name" maxLength={100} value={values.name} onChange={set("name")} autoComplete="name" />
          {fieldError("name")}
        </label>
        <label className={s.field}>
          <T v={UI.phone} lang={lang} />
          <input name="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" />
          {fieldError("phone")}
        </label>
        <fieldset className={s.field}>
          <legend>
            <T v={UI.attending} lang={lang} />
          </legend>
          {["yes", "no", "maybe"].map((option) => (
            <label key={option} className={s.choice}>
              <input type="radio" name="attending" value={option} checked={values.attending === option} onChange={set("attending")} />
              <T v={UI[option]} lang={lang} />
            </label>
          ))}
          {fieldError("attending")}
        </fieldset>
        {attendingNow && askGuestCount && (
          <label className={s.field}>
            <T v={UI.guests} lang={lang} />
            <input name="guestCount" type="number" min="1" max="20" inputMode="numeric" value={values.guestCount} onChange={set("guestCount")} />
            {fieldError("guestCount")}
          </label>
        )}
        {attendingNow && events.length > 1 && (
          <fieldset className={s.field}>
            <legend>
              <T v={UI.whichEvents} lang={lang} />
            </legend>
            {events.map((ev) => (
              <label key={ev.id} className={s.choice}>
                <input type="checkbox" checked={values.eventIds.includes(ev.id)} onChange={() => toggleEvent(ev.id)} />
                <T v={ev.name} lang={lang} />
              </label>
            ))}
          </fieldset>
        )}
        {attendingNow && askMeal && (
          <label className={s.field}>
            <T v={UI.meal} lang={lang} />
            <select name="meal" value={values.meal} onChange={set("meal")}>
              <option value="">—</option>
              <option value="veg">{plainText(UI.mealVeg, lang)}</option>
              <option value="nonveg">{plainText(UI.mealNonVeg, lang)}</option>
              <option value="jain">{plainText(UI.mealJain, lang)}</option>
            </select>
          </label>
        )}
        <label className={s.field}>
          <T v={UI.message} lang={lang} />
          <textarea name="message" rows={3} maxLength={1000} value={values.message} onChange={set("message")} />
        </label>
        <div aria-hidden="true" style={HONEYPOT_STYLE}>
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
          </label>
        </div>
        {unsendable && (
          <T as="p" v={UI.rsvpBadNumber} lang={lang} className={s.fieldError} role="alert" />
        )}
        {contactPhone ? (
          <button type="submit" className={s.button} disabled={saving}>
            <T v={UI.submit} lang={lang} />
          </button>
        ) : (
          <T as="p" v={UI.rsvpNoPhone} lang={lang} className={s.fieldError} />
        )}
      </form>
      {sent && (
        <div className={s.rsvpSent}>
          <p className={s.rsvpNote} aria-live="polite">
            <T v={UI.rsvpFallback} lang={lang} /> <a href={`tel:${contactPhone}`}>{contactPhone}</a>
          </p>
          <textarea
            ref={messageBox}
            className={s.rsvpMessageBox}
            readOnly
            rows={6}
            value={sent.message}
            aria-label={plainText(UI.rsvpMessageBox, lang)}
          />
          <div className={s.rsvpActions}>
            <button type="button" className={s.calLink} onClick={copy}>
              <T v={copied ? UI.copied : UI.copyMessage} lang={lang} />
            </button>
            <a className={s.button} href={sent.url} target="_blank" rel="noopener noreferrer">
              <T v={UI.openWhatsApp} lang={lang} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
