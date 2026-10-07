import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { inviteStaff, listStaff, OWNER_GROUP, removeStaff, StaffError } from "./staff";

type StaffEvent = {
  info: { fieldName: string };
  arguments: Record<string, any>;
  identity: { username: string; sub: string; groups?: string[] | null } | null;
};

const client = new CognitoIdentityProviderClient();

export const handler = async (event: StaffEvent) => {
  const caller = event.identity;
  // AppSync already limits these operations to the owner group; this is the second lock.
  if (!caller?.groups?.includes(OWNER_GROUP)) throw new StaffError("Only the owner can manage staff.");

  const userPoolId = process.env.STAFF_USER_POOL_ID ?? "";
  try {
    switch (event.info.fieldName) {
      case "listStaff":
        return await listStaff(client, userPoolId);
      case "inviteStaff":
        return await inviteStaff(client, userPoolId, event.arguments as { email: string; name?: string | null });
      case "removeStaff":
        return await removeStaff(client, userPoolId, {
          username: event.arguments.username,
          caller: { username: caller.username, sub: caller.sub },
        });
      default:
        throw new StaffError(`Unknown operation ${event.info.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof StaffError) throw err;
    console.error("staff-admin failed", event.info.fieldName, err);
    throw new Error("Something went wrong talking to the sign-in service. Please try again.");
  }
};
