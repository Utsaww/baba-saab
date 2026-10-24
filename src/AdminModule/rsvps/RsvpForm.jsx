"use client";

import { useId, useState } from "react";
import { textFor } from "@/InvitationModule/lib/i18n";
import { whatsappDigits } from "@/InvitationModule/lib/rsvp";

export const ATTENDING_OPTIONS = [
  ["yes", "Coming"],
  ["no", "Not coming"],
  ["maybe", "Maybe"],
];
export const MEAL_OPTIONS = [
  ["", "No preference"],
  ["veg", "Veg"],
  ["nonveg", "Non-veg"],
  ["jain", "Jain"],
];

const input = "min-h-[44px] w-full rounded-md border border-stone-300 px-3 text-sm aria-[invalid=true]:border-red-600";
const button = "inline-flex min-h-[44px] items-center rounded-full px-5 text-sm disabled:opacity-40";

function validate(v) {
  const errors = {};
  if (!v.name.trim()) errors.name = "Enter the guest's name";
  if (v.phone.trim() && !whatsappDigits(v.phone)) errors.phone = "Enter a phone number, or leave it empty";
  if (v.attending !== "no" && v.guestCount.trim()) {
    const n = Number(v.guestCount);
    if (!Number.isInteger(n) || n < 1 || n > 20) errors.guestCount = "Enter a number from 1 to 20, or leave it empty";
  }
  return errors;
}

/** Add or edit one reply. Phone is optional (replies taken by phone call may not have one). */
export default function RsvpForm({ label = "Add reply", initial, events = [], language, onSave, onCancel, pending = false, error }) {
  const id = useId();
  const [v, setV] = useState(() => ({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    attending: initial?.attending ?? "yes",
    guestCount: initial?.guestCount == null ? "" : String(initial.guestCount),
    eventIds: initial?.eventIds ?? [],
    meal: initial?.meal ?? "",
    message: initial?.message ?? "",
  }));
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setV((old) => ({ ...old, [key]: e.target.value }));
  const lang = language === "hi" ? "hi" : "en";

  const submit = (e) => {
    e.preventDefault();
    if (pending) return;
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave({
      name: v.name.trim(),
      phone: v.phone.trim(),
      attending: v.attending,
      guestCount: v.attending !== "no" && v.guestCount.trim() ? Number(v.guestCount) : null,
      eventIds: v.eventIds,
      meal: v.meal,
      message: v.message.trim(),
    });
  };

  const fieldError = (key) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} className="mt-1 text-sm text-red-700">
        {errors[key]}
      </p>
    ) : null;
  const errorProps = (key) => (errors[key] ? { "aria-invalid": "true", "aria-describedby": `${id}-${key}-error` } : {});

  return (
    <form aria-label={label} onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{label}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-medium">
            Name
          </label>
          <input id={`${id}-name`} value={v.name} onChange={set("name")} maxLength={100} className={input} {...errorProps("name")} />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="text-sm font-medium">
            Phone (optional)
          </label>
          <input id={`${id}-phone`} type="tel" value={v.phone} onChange={set("phone")} maxLength={20} className={input} {...errorProps("phone")} />
          {fieldError("phone")}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Attending</legend>
        <div className="mt-1 flex flex-wrap gap-x-4">
          {ATTENDING_OPTIONS.map(([value, text]) => (
            <label key={value} className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="radio" name={`${id}-attending`} value={value} checked={v.attending === value} onChange={set("attending")} />
              {text}
            </label>
          ))}
        </div>
      </fieldset>

      {v.attending !== "no" ? (
        <div className="max-w-[12rem]">
          <label htmlFor={`${id}-count`} className="text-sm font-medium">
            People (optional)
          </label>
          <input id={`${id}-count`} type="number" inputMode="numeric" min={1} max={20} value={v.guestCount} onChange={set("guestCount")} className={input} {...errorProps("guestCount")} />
          {fieldError("guestCount")}
        </div>
      ) : null}

      {events.length ? (
        <fieldset>
          <legend className="text-sm font-medium">Events</legend>
          <p className="text-xs text-stone-500">Leave all unticked for every event.</p>
          <div className="mt-1 flex flex-wrap gap-x-4">
            {events.map((ev) => (
              <label key={ev.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={v.eventIds.includes(ev.id)}
                  onChange={(e) =>
                    setV((old) => ({
                      ...old,
                      eventIds: e.target.checked ? [...old.eventIds, ev.id] : old.eventIds.filter((x) => x !== ev.id),
                    }))
                  }
                />
                {textFor(ev.name, lang) || "Untitled event"}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-meal`} className="text-sm font-medium">
            Meal
          </label>
          <select id={`${id}-meal`} value={v.meal} onChange={set("meal")} className={`${input} bg-white`}>
            {MEAL_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-message`} className="text-sm font-medium">
            Message
          </label>
          <textarea id={`${id}-message`} value={v.message} onChange={set("message")} maxLength={1000} rows={2} className={`${input} py-2`} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={`${button} bg-stone-900 text-white`}>
          {pending ? "Saving…" : "Save reply"}
        </button>
        <button type="button" onClick={onCancel} className={`${button} border border-stone-300 hover:bg-stone-100`}>
          Cancel
        </button>
      </div>
    </form>
  );
}
