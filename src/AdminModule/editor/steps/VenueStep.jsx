"use client";

import { FULL_LINK_HINT, Group, LocalisedInput, TextInput } from "../fields";

export default function VenueStep({ content, update, errors, language }) {
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
