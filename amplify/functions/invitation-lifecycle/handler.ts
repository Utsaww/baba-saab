import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { eraseInvitation } from "./erase";
import { runLifecycle } from "./run";
import { claimForErase, LifecycleError, load, putOnline, remove, restore, setOfflineOn, takeOffline } from "./transitions";

type AppSyncEvent = { fieldName: string; arguments: Record<string, any>; identity: { groups?: string[] | null } | null };
// The daily schedule's event has no GraphQL field (and no caller identity).
type ScheduledEvent = { fieldName?: undefined };

const db = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3 = new S3Client();
const tables = { invitation: process.env.INVITATION_TABLE ?? "", slug: process.env.INVITATION_SLUG_TABLE ?? "" };
const cfg = { tables, bucket: process.env.INVITATION_MEDIA_BUCKET ?? "" };

export const handler = async (event: AppSyncEvent | ScheduledEvent) => {
  if (!event.fieldName) return runLifecycle({ db, s3 }, cfg, new Date());

  // AppSync already limits these operations to staff; this is the second lock.
  if (!event.identity?.groups?.includes("admin")) throw new LifecycleError("Forbidden", "Staff only.");
  const now = new Date().toISOString();
  const a = event.arguments ?? {};
  try {
    switch (event.fieldName) {
      case "takeInvitationOffline":
        return await takeOffline(db, tables, { id: a.id, expectedVersion: a.expectedVersion }, now);
      case "putInvitationOnline":
        return await putOnline(db, tables, { id: a.id, expectedVersion: a.expectedVersion, offlineOn: a.offlineOn }, now);
      case "setInvitationOfflineOn":
        return await setOfflineOn(db, tables, { id: a.id, expectedVersion: a.expectedVersion, offlineOn: a.offlineOn }, now);
      case "softDeleteInvitation":
        return await remove(db, tables, { id: a.id, expectedVersion: a.expectedVersion }, now);
      case "restoreInvitation":
        return await restore(db, tables, { id: a.id, expectedVersion: a.expectedVersion, offlineOn: a.offlineOn }, now);
      case "eraseInvitationNow":
        return await eraseNow(a.id, a.confirm, now);
      default:
        throw new LifecycleError("Unknown", `Unknown operation ${event.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof LifecycleError) throw err;
    console.error("invitation-lifecycle failed", event.fieldName, err);
    throw new Error("Something went wrong. Please try again.");
  }
};

async function eraseNow(id: string, confirm: unknown, now: string) {
  const inv = await load(db, tables, id);
  if (inv.status !== "offline" && inv.status !== "deleted") {
    throw new LifecycleError("WrongStatus", "Take it offline or delete it first");
  }
  if (confirm !== (inv.slug || "delete")) throw new LifecycleError("BadConfirm", "Type the link name exactly to confirm.");
  // Claim first (purgeAt = now): from here nobody can restore it or put it back online mid-erase.
  await claimForErase(db, tables, inv, now);
  await eraseInvitation({ db, s3 }, cfg, { id: inv.id, slug: inv.slug || null }, now);
  return { erased: true };
}
