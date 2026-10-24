import { useMemo } from "react";
import { textFor } from "@/InvitationModule/lib/i18n";
import { summarize } from "@/InvitationModule/lib/rsvpList";

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <dt className="text-sm text-stone-600">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

/** Read-only totals and per-event headcounts, shared by the staff and family pages. */
export default function RsvpTotals({ rows, events, lang }) {
  const totals = useMemo(() => summarize(rows, events), [rows, events]);
  return (
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
                <dt className="text-stone-600">{textFor(e.name, lang) || "Untitled event"}</dt>
                <dd className="font-semibold">{totals.perEvent[e.id] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
