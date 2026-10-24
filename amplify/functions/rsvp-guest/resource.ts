import { defineFunction } from "@aws-amplify/backend";

// Serves the two guest operations (submitRsvp, familyRsvps). backend.ts grants it read-only access to
// Invitation and InvitationSlug and read/write to Rsvp and RsvpLimit — nothing else.
export const rsvpGuest = defineFunction({
  name: "rsvp-guest",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  // Called by the data API and reads its tables: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
