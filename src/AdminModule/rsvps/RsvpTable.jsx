"use client";

import { textFor } from "@/InvitationModule/lib/i18n";
import { familyNote } from "@/InvitationModule/lib/rsvpList";
import { ATTENDING_OPTIONS, MEAL_OPTIONS } from "./RsvpForm";

const ATTENDING = Object.fromEntries(ATTENDING_OPTIONS);
const MEAL = Object.fromEntries(MEAL_OPTIONS.filter(([v]) => v));
const ATTENDING_CLASS = { yes: "bg-green-100 text-green-900", no: "bg-stone-200 text-stone-800", maybe: "bg-yellow-100 text-yellow-900" };

const IST = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
function when(value) {
  const d = new Date(value ?? "");
  return Number.isNaN(d.getTime()) ? "" : IST.format(d);
}

const iconButton = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300 px-3 text-sm hover:bg-stone-100 disabled:opacity-40";

/** Red "!" on a reply that shares its phone with other replies; the note names them. */
function FamilyMark({ names }) {
  const note = familyNote(names);
  return (
    <span role="img" aria-label={note} title={note} className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
      !
    </span>
  );
}

export default function RsvpTable({ rows, events, language, marks, pending = {}, errors = {}, onEdit, onRemove }) {
  const lang = language === "hi" ? "hi" : "en";
  const eventNames = (ids) => {
    if (!ids?.length) return "All events";
    return ids
      .map((id) => events.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => textFor(e.name, lang))
      .filter(Boolean)
      .join(", ") || "All events";
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
          <tr>
            {["Name", "Phone", "Attending", "People", "Events", "Meal", "Message", "Replied", "Source"].map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                {h}
              </th>
            ))}
            <th scope="col" className="px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {rows.map((r) => (
            <tr key={r.rsvpKey} className="align-top">
              <td className="px-3 py-2 font-medium">
                <span className="inline-flex items-center">
                  {r.name}
                  {marks.get(r.rsvpKey) ? <FamilyMark names={marks.get(r.rsvpKey)} /> : null}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{r.phone || "—"}</td>
              <td className="px-3 py-2">
                <span className={`whitespace-nowrap rounded-full px-2 text-xs ${ATTENDING_CLASS[r.attending] ?? "bg-stone-100"}`}>{ATTENDING[r.attending] ?? r.attending}</span>
              </td>
              <td className="px-3 py-2">{r.attending === "yes" ? r.guestCount ?? 1 : "—"}</td>
              <td className="px-3 py-2">{eventNames(r.eventIds)}</td>
              <td className="px-3 py-2">{MEAL[r.meal] ?? ""}</td>
              <td className="max-w-xs whitespace-pre-line break-words px-3 py-2">{r.message ?? ""}</td>
              <td className="whitespace-nowrap px-3 py-2 text-stone-600">{when(r.updatedAt)}</td>
              <td className="px-3 py-2 text-stone-600">{r.source === "staff" ? "Staff" : "Guest"}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <button type="button" aria-label={`Edit: ${r.name}`} disabled={pending[r.rsvpKey]} onClick={() => onEdit(r)} className={iconButton}>
                    Edit
                  </button>
                  <button type="button" aria-label={`Remove: ${r.name}`} disabled={pending[r.rsvpKey]} onClick={() => onRemove(r)} className={`text-red-800 ${iconButton}`}>
                    Remove
                  </button>
                </div>
                {errors[r.rsvpKey] ? (
                  <p role="alert" className="mt-1 min-w-[10rem] text-xs text-red-700">
                    {errors[r.rsvpKey]}
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
