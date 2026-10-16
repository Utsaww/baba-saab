"use client";

import { Group, Toggle } from "../fields";
import OfflineDateField from "../lifecycle/OfflineDateField";

// RSVPs are parked until a customer asks for them: their settings are hidden, and stored `rsvp` values are kept as they are.
export default function RsvpStep({ content, update, offlineField }) {
  return (
    <div className="space-y-6">
      {offlineField ? (
        <Group title="After the wedding">
          <OfflineDateField {...offlineField} />
        </Group>
      ) : null}
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
