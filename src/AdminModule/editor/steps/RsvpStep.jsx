"use client";

import { Group, TextInput, Toggle } from "../fields";

export default function RsvpStep({ content, update, errors }) {
  const rsvp = content.rsvp ?? {};
  return (
    <div className="space-y-6">
      <Group title="RSVP">
        <Toggle
          label="Ask guests to RSVP"
          description="Adds a form where guests say whether they're coming."
          checked={rsvp.enabled}
          onChange={(v) => update(["rsvp", "enabled"], v)}
        />
        {rsvp.enabled && (
          <>
            <TextInput
              label="Last day to RSVP"
              type="date"
              value={rsvp.deadline}
              error={errors["rsvp.deadline"]}
              hint="After this day the form closes and shows the family's phone number instead."
              onChange={(v) => update(["rsvp", "deadline"], v || undefined)}
            />
            <Toggle label="Ask how many people are coming" checked={rsvp.askGuestCount ?? true} onChange={(v) => update(["rsvp", "askGuestCount"], v)} />
            <Toggle label="Ask about meal preference" checked={rsvp.askMeal ?? false} onChange={(v) => update(["rsvp", "askMeal"], v)} />
          </>
        )}
      </Group>
      <Group title="Other settings">
        <Toggle
          label='Show "Created by Baba Saab Events"'
          description="A small credit at the bottom of the invitation."
          checked={content.showCredit ?? true}
          onChange={(v) => update(["showCredit"], v)}
        />
      </Group>
    </div>
  );
}
