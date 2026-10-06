"use client";
import { useState } from "react";
import { UI } from "../lib/ui-strings";
import { plainText } from "../lib/i18n";
import { validateRsvpInput } from "../lib/rsvp";
import T from "./Text";

const EMPTY = { name: "", phone: "", attending: "", guestCount: "1", eventIds: [], meal: "", message: "", website: "" };
const HONEYPOT_STYLE = { position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" };

export default function RsvpForm({
  lang,
  events,
  askGuestCount,
  askMeal,
  closed,
  closedOnText,
  deadlineText,
  contactPhone,
  onSubmit,
  s = {},
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: "idle" });

  if (closed) {
    return (
      <p className={s.rsvpClosed} role="status">
        <T v={UI.rsvpClosed} lang={lang} /> {closedOnText}.{" "}
        {contactPhone && (
          <>
            <T v={UI.rsvpContact} lang={lang} /> <a href={`tel:${contactPhone}`}>{contactPhone}</a>
          </>
        )}
      </p>
    );
  }
  if (status.state === "done") return <T as="p" v={UI.thanks} lang={lang} className={s.rsvpThanks} />;

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
    const found = validateRsvpInput(values, { askGuestCount });
    setErrors(found);
    if (Object.keys(found).length) return;
    setStatus({ state: "sending" });
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      attending: values.attending,
      guestCount: askGuestCount && attendingNow ? Number(values.guestCount) : undefined,
      eventIds: attendingNow ? values.eventIds : [],
      meal: askMeal && attendingNow ? values.meal || undefined : undefined,
      message: values.message.trim() || undefined,
      website: values.website,
    };
    try {
      const result = await onSubmit(payload);
      setStatus(result?.ok ? { state: "done" } : { state: "error", message: result?.message || plainText(UI.rsvpFailed, lang) });
    } catch {
      setStatus({ state: "error", message: plainText(UI.rsvpFailed, lang) });
    }
  }

  return (
    <form className={s.rsvpForm} onSubmit={submit} noValidate>
      {deadlineText && (
        <p className={s.rsvpDeadline}>
          <T v={UI.rsvpBy} lang={lang} /> {deadlineText}
        </p>
      )}
      <label className={s.field}>
        <T v={UI.name} lang={lang} />
        <input name="name" value={values.name} onChange={set("name")} autoComplete="name" />
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
        <textarea name="message" rows={3} value={values.message} onChange={set("message")} />
      </label>
      <div aria-hidden="true" style={HONEYPOT_STYLE}>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
        </label>
      </div>
      {status.state === "error" && (
        <p role="alert" className={s.fieldError}>
          {status.message}
        </p>
      )}
      <button type="submit" className={s.button} disabled={status.state === "sending"}>
        <T v={status.state === "sending" ? UI.sending : UI.submit} lang={lang} />
      </button>
    </form>
  );
}
