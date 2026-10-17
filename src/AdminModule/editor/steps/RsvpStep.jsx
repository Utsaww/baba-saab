"use client";

import { whatsappRsvpOn } from "@/InvitationModule/lib/rsvp";
import { Group, TextInput, Toggle } from "../fields";
import OfflineDateField from "../lifecycle/OfflineDateField";

export default function RsvpStep({ content, update, errors = {}, offlineField }) {
  const rsvp = content.rsvp ?? {};
  // Older content may have `enabled` without `channel`: it shows as off until staff opt in here.
  const on = whatsappRsvpOn(rsvp);
  return (
    <div className="space-y-6">
      {offlineField ? (
        <Group title="After the wedding">
          <OfflineDateField {...offlineField} />
        </Group>
      ) : null}
      <Group title="RSVP">
        <Toggle
          label="Guests reply on WhatsApp"
          description="Guests' replies open WhatsApp to the family contact number from step 2. Nothing is stored by Baba Saab."
          checked={on}
          onChange={(v) => update(["rsvp"], v ? { ...rsvp, enabled: true, channel: "whatsapp" } : { ...rsvp, enabled: false })}
        />
        {on && (
          <>
            <TextInput
              label="Last day to reply"
              type="date"
              value={rsvp.deadline}
              error={errors["rsvp.deadline"]}
              hint="Optional. After this day the form closes and shows the family's phone number instead."
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
