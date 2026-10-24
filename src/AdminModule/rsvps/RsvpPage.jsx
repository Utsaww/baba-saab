"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { OFFLINE_MESSAGE } from "@/AdminModule/messages";
import { textFor } from "@/InvitationModule/lib/i18n";
import { familyMarks, filterRows, rsvpKeyFor, summarize, toCsv } from "@/InvitationModule/lib/rsvpList";
import FamilyLinkPanel from "./FamilyLinkPanel";
import RsvpForm, { ATTENDING_OPTIONS } from "./RsvpForm";
import RsvpTable from "./RsvpTable";

const button = "inline-flex min-h-[44px] items-center rounded-full px-5 text-sm disabled:opacity-40";
const control = "min-h-[44px] rounded-md border border-stone-300 bg-white px-3 text-sm";

export const csvFileName = ({ slug, id }) => `${slug || id}-rsvps.csv`;

/** Saves the CSV text as a file. `toCsv` already starts with the BOM, so none is added here. */
function downloadCsv(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <dt className="text-sm text-stone-600">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

export default function RsvpPage({ invitation, initialRows, actions }) {
  const { id, slug, title, language, events = [] } = invitation;
  const lang = language === "hi" ? "hi" : "en";
  const [rows, setRows] = useState(initialRows ?? []);
  const [token, setToken] = useState(invitation.familyToken ?? null);
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState("");
  const [attending, setAttending] = useState("all");
  const [form, setForm] = useState(null); // null, { row: null } to add, or { row } to edit
  const [formPending, setFormPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [rowPending, setRowPending] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [done, setDone] = useState("");

  // Opening the page marks its replies as seen (clears the "N new" badge). Once, even under Strict Mode.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    Promise.resolve()
      .then(() => actions.markRsvpsSeenAction?.(id))
      .catch(() => {});
  }, [actions, id]);

  const totals = useMemo(() => summarize(rows, events), [rows, events]);
  const marks = useMemo(() => familyMarks(rows), [rows]);
  const shown = useMemo(() => filterRows(rows, { q, eventId, attending }), [rows, q, eventId, attending]);
  const eventName = (e) => textFor(e.name, lang) || "Untitled event";

  const openForm = (row) => {
    setForm({ row });
    setFormError("");
    setDone("");
  };

  const save = async (values) => {
    if (formPending) return;
    const previousKey = form?.row?.rsvpKey;
    setFormPending(true);
    setFormError("");
    try {
      const r = await actions.saveRsvpAction(id, values, { previousKey });
      if (r?.ok) {
        const now = new Date().toISOString();
        const { phoneKey } = rsvpKeyFor(values);
        setRows((all) => {
          const existing = all.find((x) => x.rsvpKey === r.rsvpKey) ?? form?.row;
          const saved = {
            ...existing,
            ...values,
            meal: values.meal || null,
            message: values.message || null,
            rsvpKey: r.rsvpKey,
            phoneKey: phoneKey || null,
            source: "staff",
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          return [saved, ...all.filter((x) => x.rsvpKey !== previousKey && x.rsvpKey !== r.rsvpKey)];
        });
        setForm(null);
        setDone(`Saved: ${values.name}`);
      } else setFormError(r?.message ?? OFFLINE_MESSAGE);
    } catch {
      setFormError(OFFLINE_MESSAGE);
    } finally {
      setFormPending(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove the reply from ${row.name}?`)) return;
    const key = row.rsvpKey;
    setRowPending((p) => ({ ...p, [key]: true }));
    setRowErrors((e) => ({ ...e, [key]: null }));
    setDone("");
    try {
      const r = await actions.removeRsvpAction(id, key);
      if (r?.ok) {
        setRows((all) => all.filter((x) => x.rsvpKey !== key));
        if (form?.row?.rsvpKey === key) setForm(null);
        setDone(`Removed: ${row.name}`);
      } else setRowErrors((e) => ({ ...e, [key]: r?.message ?? OFFLINE_MESSAGE }));
    } catch {
      setRowErrors((e) => ({ ...e, [key]: OFFLINE_MESSAGE }));
    } finally {
      setRowPending((p) => ({ ...p, [key]: false }));
    }
  };

  const newFamilyLink = async () => {
    const r = await actions.newFamilyLinkAction(id);
    if (r?.ok) setToken(r.familyToken);
    return r;
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href={`/admin/invitations/${id}/edit`} className="inline-flex min-h-[44px] items-center text-sm text-stone-600 hover:underline">
          ← Back to editor
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">RSVPs · {title}</h1>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-green-800 empty:hidden">
        {done}
      </p>

      {initialRows == null ? (
        <p role="alert" className="text-sm text-red-700">
          Couldn&apos;t load replies. Refresh the page to try again.
        </p>
      ) : (
        <>
          <section aria-label="Totals" className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Coming" value={totals.coming} />
              <Stat label="Not coming" value={totals.notComing} />
              <Stat label="Maybe" value={totals.maybe} />
              <Stat label="People coming" value={totals.people} />
            </dl>
            {events.length ? (
              <div>
                <h2 className="text-sm font-medium text-stone-700">People coming per event</h2>
                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {events.map((e) => (
                    <div key={e.id} className="flex gap-2">
                      <dt className="text-stone-600">{eventName(e)}</dt>
                      <dd className="font-semibold">{totals.perEvent[e.id] ?? 0}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => openForm(null)} className={`${button} bg-stone-900 text-white`}>
              Add reply
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(toCsv(filterRows(rows, {}), events, language), csvFileName({ slug, id }))}
              disabled={rows.length === 0}
              className={`${button} border border-stone-300 hover:bg-stone-100`}
            >
              Download CSV
            </button>
          </div>

          {form ? (
            <RsvpForm
              key={form.row?.rsvpKey ?? "new"}
              label={form.row ? "Edit reply" : "Add reply"}
              initial={form.row}
              events={events}
              language={language}
              pending={formPending}
              error={formError}
              onSave={save}
              onCancel={() => setForm(null)}
            />
          ) : null}

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-600">No replies yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <input
                  type="search"
                  aria-label="Search replies"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or phone"
                  className={`${control} min-w-0 flex-1`}
                />
                {events.length ? (
                  <select aria-label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)} className={control}>
                    <option value="">All events</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {eventName(e)}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select aria-label="Attending" value={attending} onChange={(e) => setAttending(e.target.value)} className={control}>
                  <option value="all">Everyone</option>
                  {ATTENDING_OPTIONS.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
              {shown.length === 0 ? (
                <p className="text-sm text-stone-600">No replies match your search.</p>
              ) : (
                <RsvpTable
                  rows={shown}
                  events={events}
                  language={language}
                  marks={marks}
                  pending={rowPending}
                  errors={rowErrors}
                  onEdit={openForm}
                  onRemove={remove}
                />
              )}
            </div>
          )}
        </>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Family link</h2>
        <FamilyLinkPanel slug={slug} token={token} onNewLink={newFamilyLink} />
      </div>
    </div>
  );
}
