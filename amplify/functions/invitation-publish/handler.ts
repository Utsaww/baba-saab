import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { markRsvpsSeen, publish, PublishError, regenerateFamilyToken, regenerateToken, setSlug, updateLive } from "./publish";

type Event = { fieldName: string; arguments: Record<string, any>; identity: { groups?: string[] | null } | null };

const db = DynamoDBDocumentClient.from(new DynamoDBClient());
const tables = { invitation: process.env.INVITATION_TABLE ?? "", slug: process.env.INVITATION_SLUG_TABLE ?? "" };

export const handler = async (event: Event) => {
  // AppSync already limits these operations to staff; this is the second lock.
  if (!event.identity?.groups?.includes("admin")) throw new PublishError("Forbidden", "Staff only.");
  const now = new Date().toISOString();
  const a = event.arguments;
  try {
    switch (event.fieldName) {
      case "setInvitationSlug":
        return await setSlug(db, tables, { id: a.id, slug: a.slug }, now);
      case "publishInvitation":
        return await publish(db, tables, { id: a.id, expectedVersion: a.expectedVersion, offlineOn: a.offlineOn }, now);
      case "updateLiveInvitation":
        return await updateLive(db, tables, { id: a.id, expectedVersion: a.expectedVersion }, now);
      case "regeneratePreviewToken":
        return await regenerateToken(db, tables, { id: a.id });
      case "regenerateFamilyToken":
        return await regenerateFamilyToken(db, tables, { id: a.id });
      case "markRsvpsSeen":
        return await markRsvpsSeen(db, tables, { id: a.id });
      default:
        throw new PublishError("Unknown", `Unknown operation ${event.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof PublishError) throw err;
    console.error("invitation-publish failed", event.fieldName, err);
    throw new Error("Something went wrong. Please try again.");
  }
};
