import type { S3Client } from "@aws-sdk/client-s3";
import { ScanCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { eraseInvitation } from "./erase";
import { addDays, asContent, defaultOfflineOn, isEraseDue, isOfflineDue, OFFLINE_AFTER_DAYS, todayIST } from "./rules";
import { claimDueForErase, purgeAtFrom } from "./transitions";

type Clients = { db: Pick<DynamoDBDocumentClient, "send">; s3: Pick<S3Client, "send"> };
type Config = { tables: { invitation: string; slug: string; rsvp: string }; bucket: string };
type Row = {
  id: string;
  status?: string;
  version?: number;
  slug?: string | null;
  offlineOn?: string | null;
  purgeAt?: string | null;
  publishedContent?: unknown;
  content?: unknown;
};

const isConditionFailure = (err: any) => err?.name === "ConditionalCheckFailedException";

/**
 * The Take offline on date for a row published before offline dates existed: the live content's dates + 7,
 * never before tomorrow (so a long-past wedding isn't taken offline that night), or tomorrow + 7 with no date at all.
 */
export function backfillOfflineOn(row: Row, nowMs: number): string {
  const tomorrow = addDays(todayIST(nowMs), 1);
  const date = defaultOfflineOn(asContent(row.publishedContent) ?? asContent(row.content));
  if (!date) return addDays(tomorrow, OFFLINE_AFTER_DAYS);
  return date < tomorrow ? tomorrow : date;
}

/** The daily job: dates legacy live rows, takes due invitations offline and erases those whose 30 days have run out. */
export async function runLifecycle(clients: Clients, cfg: Config, now: Date) {
  const { db } = clients;
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const counts = { offline: 0, backfilled: 0, erased: 0, skipped: 0, failed: 0 };
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new ScanCommand({
        TableName: cfg.tables.invitation,
        ProjectionExpression: "id, #status, version, slug, offlineOn, purgeAt, publishedContent, content",
        ExpressionAttributeNames: { "#status": "status" },
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    for (const row of (page.Items ?? []) as Row[]) {
      if (row.status === "published" && row.offlineOn == null) {
        try {
          await db.send(
            new UpdateCommand({
              TableName: cfg.tables.invitation,
              Key: { id: row.id },
              UpdateExpression: "SET offlineOn = :d",
              // Only if it is still live with no date: staff may have set one since the scan. Never touches version.
              ConditionExpression: "#status = :published AND (attribute_not_exists(offlineOn) OR attribute_type(offlineOn, :null))",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":d": backfillOfflineOn(row, nowMs), ":published": "published", ":null": "NULL" },
            }),
          );
          counts.backfilled += 1;
        } catch (err) {
          if (isConditionFailure(err)) continue; // changed meanwhile: tomorrow's run looks again
          counts.failed += 1;
          console.error("lifecycle: backfill failed", row.id, err);
        }
      } else if (isOfflineDue(row, nowMs)) {
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
          // Erasing files can't be made conditional, so claim the row first (purgeAt = the epoch), conditioned on the
          // status and purgeAt the scan saw. It fails if the row was restored, deleted again with a fresh 30 days, or
          // went since; once it succeeds, restore and put-online are refused until the erase is done.
          if (!(await claimDueForErase(db, cfg.tables, { id: row.id, status: row.status!, purgeAt: row.purgeAt }))) {
            counts.skipped += 1;
            continue;
          }
          // Counts as erased only if the record itself went; a failed condition means it changed meanwhile.
          if (await eraseInvitation(clients, cfg, { id: row.id, slug: row.slug ?? null }, nowIso)) counts.erased += 1;
          else counts.skipped += 1;
        } catch (err) {
          counts.failed += 1;
          console.error("lifecycle: erase failed", row.id, err);
        }
      }
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  console.log(
    `lifecycle: offline=${counts.offline} backfilled=${counts.backfilled} erased=${counts.erased} skipped=${counts.skipped} failed=${counts.failed}`,
  );
  return counts;
}
