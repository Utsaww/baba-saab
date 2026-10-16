import { defineFunction } from "@aws-amplify/backend";

export const invitationLifecycle = defineFunction({
  name: "invitation-lifecycle",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  // 21:30 UTC = 03:00 IST, daily.
  schedule: "30 21 * * ? *",
  // Called by the data API and reads its tables: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
