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

const actionButton = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300 px-3 text-sm hover:bg-stone-100 disabled:opacity-40";
const people = (r) => (r.attending === "yes" ? r.guestCount ?? 1 : null);
const sourceLabel = (r) => (r.source === "staff" ? "Staff" : "Guest");

/** Red "!" on a reply that shares its phone with other replies; the note names them. */
function FamilyMark({ names }) {
  const note = familyNote(names);
  return (
    <span role="img" aria-label={note} title={note} className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
      !
    </span>
  );
}

function AttendingBadge({ value }) {
  return <span className={`whitespace-nowrap rounded-full px-2 text-xs ${ATTENDING_CLASS[value] ?? "bg-stone-100"}`}>{ATTENDING[value] ?? value}</span>;
}

// Edit passes its own button so the page can hand focus back to it when the form closes.
function Actions({ row, pending, onEdit, onRemove }) {
  return (
    <div className="flex gap-2">
      <button type="button" aria-label={`Edit: ${row.name}`} disabled={pending} onClick={(e) => onEdit(row, e.currentTarget)} className={actionButton}>
        Edit
      </button>
      <button type="button" aria-label={`Remove: ${row.name}`} disabled={pending} onClick={() => onRemove(row)} className={`text-red-800 ${actionButton}`}>
        Remove
      </button>
    </div>
  );
}

function RowError({ text }) {
  return text ? (
    <p role="alert" className="mt-1 min-w-[10rem] text-xs text-red-700">
      {text}
    </p>
  ) : null;
}

/**
 * The replies, twice: cards on phones (actions visible without sideways scrolling) and a table from `sm` up.
 * CSS shows one; the hidden one is `display: none`, so assistive tech only meets the visible copy.
 */
export default function RsvpTable({ rows, events, language, marks, pending = {}, errors = {}, onEdit, onRemove }) {
  // Without handlers the table is read-only (the family page): no Actions column, no buttons.
  const editable = Boolean(onEdit && onRemove);
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
  const mark = (r) => (marks.get(r.rsvpKey) ? <FamilyMark names={marks.get(r.rsvpKey)} /> : null);

  return (
    <>
      <ul aria-label="Replies" className="space-y-3 sm:hidden">
        {rows.map((r) => (
          <li key={r.rsvpKey} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="inline-flex min-w-0 items-center break-words font-medium">
                {r.name}
                {mark(r)}
              </h3>
              <AttendingBadge value={r.attending} />
            </div>
            <p className="mt-1 text-stone-700">
              {people(r) != null ? <span>{`${people(r)} ${people(r) === 1 ? "person" : "people"}`}</span> : null}
              {people(r) != null ? " · " : null}
              <span>{eventNames(r.eventIds)}</span>
            </p>
            <p className="mt-1 text-stone-600">
              {[r.phone, MEAL[r.meal], `${sourceLabel(r)} · ${when(r.updatedAt)}`].filter(Boolean).join(" · ")}
            </p>
            {r.message ? <p className="mt-1 whitespace-pre-line break-words text-stone-700">{r.message}</p> : null}
            {editable ? (
              <div className="mt-3">
                <Actions row={r} pending={pending[r.rsvpKey]} onEdit={onEdit} onRemove={onRemove} />
                <RowError text={errors[r.rsvpKey]} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white sm:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              {["Name", "Phone", "Attending", "People", "Events", "Meal", "Message", "Replied", "Source"].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
              {editable ? (
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rows.map((r) => (
              <tr key={r.rsvpKey} className="align-top">
                <td className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center">
                    {r.name}
                    {mark(r)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{r.phone || "—"}</td>
                <td className="px-3 py-2">
                  <AttendingBadge value={r.attending} />
                </td>
                <td className="px-3 py-2">{people(r) ?? "—"}</td>
                <td className="px-3 py-2">{eventNames(r.eventIds)}</td>
                <td className="px-3 py-2">{MEAL[r.meal] ?? ""}</td>
                <td className="max-w-xs whitespace-pre-line break-words px-3 py-2">{r.message ?? ""}</td>
                <td className="whitespace-nowrap px-3 py-2 text-stone-600">{when(r.updatedAt)}</td>
                <td className="px-3 py-2 text-stone-600">{sourceLabel(r)}</td>
                {editable ? (
                  <td className="px-3 py-2">
                    <Actions row={r} pending={pending[r.rsvpKey]} onEdit={onEdit} onRemove={onRemove} />
                    <RowError text={errors[r.rsvpKey]} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
