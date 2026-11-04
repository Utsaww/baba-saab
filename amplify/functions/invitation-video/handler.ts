import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAKING_TIMEOUT_MS, readState, videoFileName } from "./video";

type AppSyncEvent = { fieldName: string; arguments: Record<string, any>; identity: { groups?: string[] | null } | null };
type VideoState = { status: "none" | "making" | "ready" | "failed"; url?: string; fileName?: string; note?: string };
type Deps = {
  db: Pick<DynamoDBDocumentClient, "send">;
  table: string;
  invoke: (cmd: InvokeCommand) => Promise<unknown>;
  presign: (key: string, fileName: string) => Promise<string>;
};

// Same shape and names as invitation-lifecycle's error, so AppSync shows the message to staff.
class VideoError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

const bucket = process.env.INVITATION_MEDIA_BUCKET ?? "";
const s3 = new S3Client();
const lambda = new LambdaClient();
const realDeps: Deps = {
  db: DynamoDBDocumentClient.from(new DynamoDBClient()),
  table: process.env.INVITATION_TABLE ?? "",
  invoke: (cmd) => lambda.send(cmd),
  presign: (key, fileName) =>
    getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
      }),
      { expiresIn: 15 * 60 },
    ),
};

export const handler = (event: AppSyncEvent) => handle(event, realDeps);

export async function handle(event: AppSyncEvent, deps: Deps): Promise<VideoState> {
  // AppSync already limits these operations to staff; this is the second lock.
  if (!event.identity?.groups?.includes("admin")) throw new VideoError("Forbidden", "Staff only.");
  const id = event.arguments?.id;
  try {
    switch (event.fieldName) {
      case "makeInvitationVideo":
        return await start(deps, id);
      case "invitationVideoStatus":
        return await describe(deps, await load(deps, id));
      default:
        throw new VideoError("Unknown", `Unknown operation ${event.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof VideoError) throw err;
    console.error("invitation-video failed", event.fieldName, err);
    throw new Error("Something went wrong. Please try again.");
  }
}

async function load({ db, table }: Deps, id: string, consistent = false) {
  const { Item } = await db.send(new GetCommand({ TableName: table, Key: { id }, ConsistentRead: consistent }));
  if (!Item) throw new VideoError("NotFound", "Invitation not found.");
  return Item;
}

async function describe(deps: Deps, inv: Record<string, any>): Promise<VideoState> {
  const status = readState(inv, Date.now());
  if (status !== "ready" || !inv.videoKey) return { status: status === "ready" ? "none" : status };
  const fileName = videoFileName(inv.slug);
  const state: VideoState = { status, url: await deps.presign(inv.videoKey, fileName), fileName };
  if (inv.videoNote) state.note = inv.videoNote;
  return state;
}

async function start(deps: Deps, id: string): Promise<VideoState> {
  const inv = await load(deps, id);
  if (inv.status !== "published") throw new VideoError("WrongStatus", "Only a live invitation can have a video.");
  const current = readState(inv, Date.now());
  if (current === "ready" || current === "making") return describe(deps, inv);

  const job = randomUUID();
  const now = Date.now();
  try {
    // One job per live version: only one caller can win this claim while another is still making.
    await deps.db.send(
      new UpdateCommand({
        TableName: deps.table,
        Key: { id },
        UpdateExpression:
          "SET videoStatus = :making, videoJob = :job, videoLiveVersion = :lv, videoStartedAt = :now REMOVE videoNote",
        ConditionExpression:
          "#s = :published AND liveVersion = :lv AND (attribute_not_exists(videoStatus) OR videoStatus <> :making OR videoLiveVersion <> :lv OR videoStartedAt < :cutoff)",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":making": "making",
          ":job": job,
          ":lv": inv.liveVersion,
          ":now": new Date(now).toISOString(),
          ":published": "published",
          ":cutoff": new Date(now - MAKING_TIMEOUT_MS).toISOString(),
        },
      }),
    );
  } catch (err: any) {
    if (err?.name !== "ConditionalCheckFailedException") throw err;
    // Lost the race (or the invitation changed): report what the record says now.
    const fresh = await load(deps, id, true);
    const state = readState(fresh, Date.now());
    if (state === "making" || state === "ready") return describe(deps, fresh);
    throw new VideoError("WrongStatus", "This invitation changed — reload the page.");
  }

  let content = inv.publishedContent;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      content = undefined;
    }
  }
  const musicKey = content?.media?.music?.key;
  const event = { id, slug: inv.slug, liveVersion: inv.liveVersion, job, ...(musicKey ? { musicKey } : {}) };
  try {
    await deps.invoke(
      new InvokeCommand({
        FunctionName: process.env.VIDEO_RENDER_FUNCTION,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(event)),
      }),
    );
  } catch (err) {
    // Never started: release the claim now rather than leave "making" for five minutes.
    await deps.db
      .send(
        new UpdateCommand({
          TableName: deps.table,
          Key: { id },
          UpdateExpression: "SET videoStatus = :failed",
          ConditionExpression: "videoJob = :job",
          ExpressionAttributeValues: { ":failed": "failed", ":job": job },
        }),
      )
      .catch((e) => console.error("invitation-video: could not release the claim", id, e));
    throw err;
  }
  return { status: "making" };
}
