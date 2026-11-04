import { UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type Db = Pick<DynamoDBDocumentClient, "send">;
const lost = (err: any) => err?.name === "ConditionalCheckFailedException";

/** Marks the video ready, but only if this job still owns the record and that version is still live. False: a newer job
 * started, or the invitation was taken offline, deleted or updated meanwhile. */
export async function finishJob(
  db: Db,
  table: string,
  { id, job, key, note }: { id: string; job: string; key: string; note?: string },
  now: string,
): Promise<boolean> {
  try {
    await db.send(
      new UpdateCommand({
        TableName: table,
        Key: { id },
        UpdateExpression: "SET videoStatus = :status, videoKey = :key, videoNote = :note, videoFinishedAt = :now",
        ConditionExpression: "videoJob = :job AND #s = :published AND liveVersion = videoLiveVersion",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ready", ":key": key, ":note": note ?? null, ":now": now, ":job": job, ":published": "published" },
      }),
    );
    return true;
  } catch (err) {
    if (lost(err)) return false;
    throw err;
  }
}

/** Marks this job failed; a newer job's record is left alone. */
export async function failJob(db: Db, table: string, { id, job }: { id: string; job: string }, now: string) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: table,
        Key: { id },
        UpdateExpression: "SET videoStatus = :status, videoFinishedAt = :now",
        ConditionExpression: "videoJob = :job",
        ExpressionAttributeValues: { ":status": "failed", ":now": now, ":job": job },
      }),
    );
  } catch (err) {
    if (!lost(err)) throw err;
  }
}
