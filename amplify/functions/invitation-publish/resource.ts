import { defineFunction } from "@aws-amplify/backend";

export const invitationPublish = defineFunction({
  name: "invitation-publish",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  // Called by the data API and reads its tables: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
