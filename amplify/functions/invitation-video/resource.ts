import { defineFunction } from "@aws-amplify/backend";

export const invitationVideo = defineFunction({
  name: "invitation-video",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  // Called by the data API and reads its table: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
