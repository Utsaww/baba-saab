import { DeleteObjectsCommand, ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3";
import { BatchWriteCommand, DeleteCommand, QueryCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type Db = Pick<DynamoDBDocumentClient, "send">;
type S3 = Pick<S3Client, "send">;
// Ids are UUIDs: letters, digits and dashes only, so the prefix can never climb out of its own folder.
const SAFE_ID = /^[A-Za-z0-9-]{8,}$/;

/**
 * Deletes one invitation's own files, then its RSVPs, then its link name (if still its own), then the record.
 * Safe to repeat: any failure stops before the record goes, so the next run still has a record to retry from.
 * Only call it for a row whose purgeAt is at or before `now`: from then on restore and put-online are refused
 * (transitions.ts), so nothing can bring the row back while its files are going. Returns whether the record
 * itself was deleted by this call.
 */
export async function eraseInvitation(
  { db, s3 }: { db: Db; s3: S3 },
  { tables, bucket }: { tables: { invitation: string; slug: string; rsvp: string }; bucket: string },
  inv: { id: string; slug?: string | null },
  now: string,
): Promise<boolean> {
  if (!SAFE_ID.test(inv.id)) throw new Error(`refusing to erase unsafe id ${JSON.stringify(inv.id)}`);
  const Prefix = `invitations/${inv.id}/`;
  let ContinuationToken: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken }));
    const keys = (page.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key.startsWith(Prefix));
    if (keys.length) {
      // Quiet mode doesn't throw for keys it couldn't delete; it lists them. Stop before the record goes,
      // so the next run still has a record to retry from.
      const res = await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }));
      if (res.Errors?.length) {
        throw new Error(`S3 delete failed for ${res.Errors.length} key(s): ${res.Errors[0].Key} ${res.Errors[0].Code}`);
      }
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);

  await eraseRsvps(db, tables.rsvp, inv.id);

  if (inv.slug) {
    try {
      await db.send(
        new DeleteCommand({
          TableName: tables.slug,
          Key: { slug: inv.slug },
          ConditionExpression: "invitationId = :id",
          ExpressionAttributeValues: { ":id": inv.id },
        }),
      );
    } catch (err: any) {
      if (err?.name !== "ConditionalCheckFailedException") throw err; // already gone or reused: fine
    }
  }
  try {
    await db.send(
      new DeleteCommand({
        TableName: tables.invitation,
        Key: { id: inv.id },
        ConditionExpression: "#status IN (:offline, :deleted) AND purgeAt <= :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":offline": "offline", ":deleted": "deleted", ":now": now },
      }),
    );
    return true;
  } catch (err: any) {
    if (err?.name !== "ConditionalCheckFailedException") throw err;
    console.warn("lifecycle: record not erased (changed or already gone)", inv.id);
    return false;
  }
}

const BATCH = 25; // DynamoDB's BatchWriteItem limit
const BATCH_ATTEMPTS = 6;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deletes every RSVP row of one invitation, a page at a time. Throws if any delete can't be completed. */
async function eraseRsvps(db: Db, table: string, invitationId: string) {
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "invitationId = :id",
        ExpressionAttributeValues: { ":id": invitationId },
        ProjectionExpression: "invitationId, rsvpKey",
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    const keys = (page.Items ?? []).map((r) => ({ invitationId: r.invitationId, rsvpKey: r.rsvpKey }));
    for (let i = 0; i < keys.length; i += BATCH) {
      let pending: any[] = keys.slice(i, i + BATCH).map((Key) => ({ DeleteRequest: { Key } }));
      for (let attempt = 1; pending.length; attempt++) {
        if (attempt > BATCH_ATTEMPTS) throw new Error(`RSVP delete left ${pending.length} unprocessed for ${invitationId}`);
        if (attempt > 1) await pause(25 * 2 ** (attempt - 2));
        const res = await db.send(new BatchWriteCommand({ RequestItems: { [table]: pending } }));
        pending = res.UnprocessedItems?.[table] ?? [];
      }
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
}
