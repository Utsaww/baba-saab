import { defineFunction } from "@aws-amplify/backend";

export const invitationPublic = defineFunction({
  name: "invitation-public",
  entry: "./handler.ts",
  timeoutSeconds: 5,
  // Called by the data API and reads its tables: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
