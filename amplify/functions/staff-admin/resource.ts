import { defineFunction } from "@aws-amplify/backend";

export const staffAdmin = defineFunction({
  name: "staff-admin",
  entry: "./handler.ts",
  timeoutSeconds: 15,
  // Kept in the auth stack: it needs user pool permissions and is called by the data API,
  // and placing it with auth avoids a circular dependency between the auth and data stacks.
  resourceGroupName: "auth",
});
