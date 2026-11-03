"use client";

import { formatShortDate } from "@/InvitationModule/lib/datetime";
import { DATE_STYLES } from "@/InvitationModule/schema/invitation";
import { ChipGroup, FULL_LINK_HINT, Group, LocalisedInput, TextInput, Toggle } from "../fields";

export default function VenueStep({ content, update, errors, language }) {
  const start = content.mainDate || "2026-12-11";
  const end = content.mainDate ? content.mainDateEnd : "2026-12-12";
  const lang = content.language === "hi" ? "hi" : "en";
  const dateOptions = DATE_STYLES.map((id) => ({ id, label: formatShortDate(start, end, id, lang) }));
  return (
    <div className="space-y-6">
      <Group title="Wedding date">
        <TextInput
          label="Main wedding date"
          type="date"
          value={content.mainDate}
          error={errors.mainDate}
          hint="Used for the countdown and the save-the-date."
          onChange={(v) => update(["mainDate"], v || undefined)}
        />
        <TextInput
          label="Ends on (for multi-day weddings)"
          type="date"
          value={content.mainDateEnd}
          error={errors.mainDateEnd}
          hint="Leave empty for a single-day wedding."
          onChange={(v) => update(["mainDateEnd"], v || undefined)}
        />
        <ChipGroup
          legend="How the date is written"
          options={dateOptions}
          value={content.custom?.dateStyle ?? "classic"}
          onChange={(id) => update(["custom", "dateStyle"], id === "classic" ? undefined : id)}
        />
      </Group>
      <Group title="Venue">
        <LocalisedInput label="Venue name" value={content.venue?.name} language={language} onChange={(v) => update(["venue", "name"], v)} />
        <LocalisedInput label="Address" multiline value={content.venue?.address} language={language} onChange={(v) => update(["venue", "address"], v)} />
        <TextInput
          label="Google Maps link"
          type="url"
          value={content.venue?.mapsUrl}
          error={errors["venue.mapsUrl"] ? FULL_LINK_HINT : undefined}
          hint="Open the venue in Google Maps, tap Share, copy the link and paste it here."
          onChange={(v) => update(["venue", "mapsUrl"], v.trim() || undefined)}
        />
        <Toggle label='Show "Open in Google Maps"' checked={!content.venue?.hideMap} onChange={(on) => update(["venue", "hideMap"], on ? undefined : true)} />
      </Group>
      <Group title="Travel notes">
        <LocalisedInput
          label="Travel notes"
          multiline
          hint="Nearest airport and railway station, weather tips. One point per line."
          value={content.venue?.travelNotes}
          language={language}
          onChange={(v) => update(["venue", "travelNotes"], v)}
        />
      </Group>
    </div>
  );
}
