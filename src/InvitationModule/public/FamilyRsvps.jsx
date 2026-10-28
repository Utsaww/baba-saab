"use client";

import { useMemo, useState } from "react";
import RsvpTotals from "@/AdminModule/rsvps/RsvpTotals";
import RsvpTable from "@/AdminModule/rsvps/RsvpTable";
import { ATTENDING_OPTIONS } from "@/AdminModule/rsvps/RsvpForm";
import { csvFileName, downloadCsv } from "@/AdminModule/rsvps/downloadCsv";
import { textFor } from "@/InvitationModule/lib/i18n";
import { coupleTitle } from "@/InvitationModule/lib/names";
import { familyMarks, filterRows, toCsv } from "@/InvitationModule/lib/rsvpList";

const control = "min-h-[44px] rounded-md border border-stone-300 bg-white px-3 text-sm";

/** The private, read-only list a family opens from its link. Shows phone numbers, so the link is secret. */
export default function FamilyRsvps({ slug, data }) {
  const { couple, language, events = [], rows = [] } = data;
  const lang = language === "hi" ? "hi" : "en";
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState("");
  const [attending, setAttending] = useState("all");
  const marks = useMemo(() => familyMarks(rows), [rows]);
  const shown = useMemo(() => filterRows(rows, { q, eventId, attending }), [rows, q, eventId, attending]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-stone-800 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-stone-600">RSVPs</p>
          <h1 className="font-serif text-2xl font-semibold">{coupleTitle({ couple }, lang)}</h1>
        </div>

        <RsvpTotals rows={rows} events={events} lang={lang} />

        <div>
          <button
            type="button"
            onClick={() => downloadCsv(toCsv(filterRows(rows, {}), events, language), csvFileName({ slug }))}
            disabled={rows.length === 0}
            className="inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100 disabled:opacity-40"
          >
            Download CSV
          </button>
        </div>

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
                      {textFor(e.name, lang) || "Untitled event"}
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
              <RsvpTable rows={shown} events={events} language={language} marks={marks} />
            )}
          </div>
        )}
        <p className="pt-4 text-center text-xs text-stone-500">Baba Saab Events</p>
      </div>
    </main>
  );
}
