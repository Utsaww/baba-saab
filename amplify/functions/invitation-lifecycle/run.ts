import type { S3Client } from "@aws-sdk/client-s3";
import { GetCommand, ScanCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { eraseInvitation } from "./erase";
import { isEraseDue, isOfflineDue } from "./rules";
import { purgeAtFrom } from "./transitions";

type Clients = { db: Pick<DynamoDBDocumentClient, "send">; s3: Pick<S3Client, "send"> };
type Config = { tables: { invitation: string; slug: string }; bucket: string };
type Row = { id: string; status?: string; version?: number; slug?: string | null; offlineOn?: string | null; purgeAt?: string | null };

const isConditionFailure = (err: any) => err?.name === "ConditionalCheckFailedException";

/** The daily job: takes due invitations offline and erases those whose 30 days have run out. */
export async function runLifecycle(clients: Clients, cfg: Config, now: Date) {
  const { db } = clients;
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const counts = { offline: 0, erased: 0, failed: 0 };
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new ScanCommand({
        TableName: cfg.tables.invitation,
        ProjectionExpression: "id, #status, version, slug, offlineOn, purgeAt",
        ExpressionAttributeNames: { "#status": "status" },
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    for (const row of (page.Items ?? []) as Row[]) {
      if (isOfflineDue(row, nowMs)) {
        try {
          await db.send(
            new UpdateCommand({
              TableName: cfg.tables.invitation,
              Key: { id: row.id },
              UpdateExpression: "SET #status = :offline, offlineAt = :now, purgeAt = :purge",
              // Only if nobody changed its status or its offline date since the scan. Never touches version.
              ConditionExpression: "#status = :published AND offlineOn = :seen",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":offline": "offline",
                ":published": "published",
                ":seen": row.offlineOn,
                ":now": nowIso,
                ":purge": purgeAtFrom(nowIso),
              },
            }),
          );
          counts.offline += 1;
        } catch (err) {
          if (isConditionFailure(err)) continue; // changed meanwhile: tomorrow's run looks again
          counts.failed += 1;
          console.error("lifecycle: offline failed", row.id, err);
        }
      } else if (isEraseDue(row, nowMs)) {
        try {
          // Erasing files can't be made conditional, so re-read first: skip it if it was restored,
          // or deleted again with a fresh 30 days, since the scan.
          const { Item } = await db.send(
            new GetCommand({ TableName: cfg.tables.invitation, Key: { id: row.id }, ConsistentRead: true }),
          );
          const fresh = Item as Row | undefined;
          if (!fresh || !isEraseDue(fresh, nowMs) || fresh.purgeAt !== row.purgeAt) continue;
          await eraseInvitation(clients, cfg, { id: fresh.id, slug: fresh.slug ?? null });
          counts.erased += 1;
        } catch (err) {
          counts.failed += 1;
          console.error("lifecycle: erase failed", row.id, err);
        }
      }
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  console.log(`lifecycle: offline=${counts.offline} erased=${counts.erased} failed=${counts.failed}`);
  return counts;
}
