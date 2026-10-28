import { defineFunction } from "@aws-amplify/backend";

// Serves the two guest operations (submitRsvp, familyRsvps). backend.ts grants it only the calls it makes: GetItem on
// Invitation and InvitationSlug (plus bumping rsvpNewCount), GetItem/PutItem/Query on Rsvp, UpdateItem on RsvpLimit.
export const rsvpGuest = defineFunction({
  name: "rsvp-guest",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  // Called by the data API and reads its tables: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
