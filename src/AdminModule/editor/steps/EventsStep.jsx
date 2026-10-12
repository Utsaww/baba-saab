"use client";

import { textFor } from "@/InvitationModule/lib/i18n";
import { chipClass } from "../../ui";
import { FULL_LINK_HINT, Group, LocalisedInput, TextInput } from "../fields";

export const EVENT_PRESETS = [
  { key: "haldi", name: { en: "Haldi", hi: "हल्दी" } },
  { key: "mehendi", name: { en: "Mehendi", hi: "मेहंदी" } },
  { key: "sangeet", name: { en: "Sangeet", hi: "संगीत" } },
  { key: "vivah", name: { en: "Vivah", hi: "विवाह" } },
  { key: "reception", name: { en: "Reception", hi: "स्वागत समारोह" } },
];

const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-40";
// randomUUID needs a secure page (https); fall back when staff open the admin over plain http on a LAN.
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "").slice(0, 10);

export default function EventsStep({ content, update, errors, language }) {
  const events = content.events ?? [];
  const setEvents = (next) => update(["events"], next);
  const add = (name = {}) => setEvents([...events, { id: newId(), name, ...(content.mainDate ? { date: content.mainDate } : {}) }]);
  const move = (from, to) => {
    const next = [...events];
    const [event] = next.splice(from, 1);
    next.splice(to, 0, event);
    setEvents(next);
  };
  const at = (i, key) => ["events", i, key];

  return (
    <div className="space-y-6">
      {events.length === 0 && <p className="text-sm text-stone-600">No events yet. Add each function guests are invited to.</p>}

      {events.map((event, i) => {
        const title = textFor(event.name, language === "hi" ? "hi" : "en") || `Event ${i + 1}`;
        return (
          <Group key={event.id} title={title}>
            <LocalisedInput label="Event name" value={event.name} language={language} onChange={(v) => update(at(i, "name"), v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Date" type="date" value={event.date} error={errors[`events.${i}.date`]} onChange={(v) => update(at(i, "date"), v || undefined)} />
              <TextInput label="Time" type="time" value={event.time} error={errors[`events.${i}.time`]} onChange={(v) => update(at(i, "time"), v || undefined)} />
            </div>
            <LocalisedInput label="Venue (if different)" value={event.venueName} language={language} onChange={(v) => update(at(i, "venueName"), v)} />
            <LocalisedInput label="Address (if different)" multiline value={event.address} language={language} onChange={(v) => update(at(i, "address"), v)} />
            <TextInput
              label="Google Maps link (if different)"
              type="url"
              value={event.mapsUrl}
              error={errors[`events.${i}.mapsUrl`] ? FULL_LINK_HINT : undefined}
              onChange={(v) => update(at(i, "mapsUrl"), v.trim() || undefined)}
            />
            <LocalisedInput label="Dress code" value={event.dressCode} language={language} onChange={(v) => update(at(i, "dressCode"), v)} />
            <LocalisedInput label="Description" multiline value={event.description} language={language} onChange={(v) => update(at(i, "description"), v)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${title} up`} className={smallButton}>
                Move up
              </button>
              <button type="button" disabled={i === events.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${title} down`} className={smallButton}>
                Move down
              </button>
              <button type="button" onClick={() => {
                  if (window.confirm(`Remove ${title}? This can't be undone.`)) setEvents(events.filter((_, j) => j !== i));
                }} aria-label={`Remove ${title}`} className={smallButton}>
                Remove
              </button>
            </div>
          </Group>
        );
      })}

      <div>
        <p className="text-sm font-medium">Add an event</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EVENT_PRESETS.map((preset) => (
            <button key={preset.key} type="button" onClick={() => add(preset.name)} className={chipClass(false)}>
              + {preset.name.en}
            </button>
          ))}
          <button type="button" onClick={() => add()} className={chipClass(false)}>
            + Other event
          </button>
        </div>
      </div>
    </div>
  );
}
