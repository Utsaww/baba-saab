"use client";

import { orderedSectionIds } from "@/InvitationModule/lib/sections";

export const SECTION_LABELS = {
  invocation: "Blessing (Ganesh, shloka)",
  couple: "The couple",
  saveTheDate: "Save the date",
  countdown: "Countdown",
  venue: "Venue & map",
  travel: "Travel notes",
  schedule: "Events schedule",
  gallery: "Photo gallery",
  film: "Invitation film",
  rsvp: "RSVP form",
  closing: "Closing message & families",
};

const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-3 text-sm hover:bg-stone-100 disabled:opacity-40";

export default function SectionsStep({ content, update }) {
  const order = orderedSectionIds(content.theme);
  const hidden = content.theme?.hidden ?? [];

  const move = (from, to) => {
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    update(["theme", "sectionOrder"], next);
  };
  const setShown = (id, shown) => update(["theme", "hidden"], shown ? hidden.filter((h) => h !== id) : [...hidden, id]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        The cover always comes first. Sections with nothing filled in stay hidden on the invitation automatically.
      </p>
      <ol aria-label="Sections in order" className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {order.map((id, i) => {
          const label = SECTION_LABELS[id];
          return (
            <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 font-medium">{label}</span>
              <label className="flex min-h-[44px] items-center gap-2 text-sm">
                <input type="checkbox" aria-label={`Show ${label}`} checked={!hidden.includes(id)} onChange={(e) => setShown(id, e.target.checked)} className="h-5 w-5" />
                Show
              </label>
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${label} up`} className={smallButton}>
                ↑
              </button>
              <button type="button" disabled={i === order.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${label} down`} className={smallButton}>
                ↓
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
