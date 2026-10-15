import { randomBytes } from "node:crypto";
import { GetCommand, TransactWriteCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type Tables = { invitation: string; slug: string };
type Db = Pick<DynamoDBDocumentClient, "send">;

// AppSync reports a Lambda error's `name` as its errorType, which the website maps to a message.
export class PublishError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

// Same rules as src/InvitationModule/lib/slug.js validateSlug (kept here because Lambdas can't import src/).
const RESERVED = ["new", "preview", "admin", "api"];
export function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length >= 3 &&
    slug.length <= 60 &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED.includes(slug)
  );
}

// Strongly consistent: the editor saves pending edits straight before publishing, and an eventually
// consistent read could still return the version before that save and report a false conflict.
async function load(db: Db, tables: Tables, id: string) {
  const { Item } = await db.send(new GetCommand({ TableName: tables.invitation, Key: { id }, ConsistentRead: true }));
  if (!Item) throw new PublishError("NotFound", "That invitation no longer exists.");
  return Item as { id: string; status: string; version: number; slug?: string | null; content: unknown };
}

const isConditionFailure = (err: any) => err?.name === "ConditionalCheckFailedException";

export async function setSlug(db: Db, tables: Tables, { id, slug }: { id: string; slug: string }, now: string) {
  if (!isValidSlug(slug)) throw new PublishError("InvalidSlug", "That link name isn't allowed.");
  const inv = await load(db, tables, id);
  if (inv.status !== "draft") throw new PublishError("NotDraft", "The link name is locked after publishing.");
  if (inv.slug === slug) return { slug };

  const items: any[] = [
    {
      Put: {
        TableName: tables.slug,
        Item: { slug, invitationId: id, __typename: "InvitationSlug", createdAt: now, updatedAt: now },
        ConditionExpression: "attribute_not_exists(slug)",
      },
    },
    {
      Update: {
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: "SET slug = :slug",
        ConditionExpression: "#status = :draft AND (attribute_not_exists(slug) OR slug = :old OR slug = :null)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":slug": slug, ":draft": "draft", ":old": inv.slug ?? null, ":null": null },
      },
    },
  ];
  if (inv.slug) {
    items.push({
      Delete: {
        TableName: tables.slug,
        Key: { slug: inv.slug },
        ConditionExpression: "invitationId = :id",
        ExpressionAttributeValues: { ":id": id },
      },
    });
  }
  try {
    await db.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (err: any) {
    if (err?.name === "TransactionCanceledException") {
      const reasons = err.CancellationReasons ?? [];
      if (reasons[0]?.Code === "ConditionalCheckFailed") throw new PublishError("SlugTaken", "That link name is already taken.");
      throw new PublishError("NotDraft", "The invitation changed — reload and try again.");
    }
    throw err;
  }
  return { slug };
}

async function goLive(db: Db, tables: Tables, id: string, expectedVersion: number, now: string, first: boolean) {
  const inv = await load(db, tables, id);
  if (first && inv.status !== "draft") throw new PublishError("NotDraft", "This invitation is already published.");
  if (!first && inv.status !== "published") throw new PublishError("NotPublished", "Publish the invitation first.");
  if (first && !inv.slug) throw new PublishError("NoSlug", "Choose a link name first.");
  if (inv.version !== expectedVersion) throw new PublishError("VersionConflict", "Updated by someone else — reload");

  const set = first
    ? "SET publishedContent = :content, liveVersion = :v, #status = :published, publishedAt = :now, liveUpdatedAt = :now"
    : "SET publishedContent = :content, liveVersion = :v, liveUpdatedAt = :now";
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: set,
        ConditionExpression: `version = :v AND #status = ${first ? ":draft" : ":published"}`,
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":content": inv.content,
          ":v": expectedVersion,
          ":now": now,
          ":published": "published",
          ...(first ? { ":draft": "draft" } : {}),
        },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw new PublishError("VersionConflict", "Updated by someone else — reload");
    throw err;
  }
  return first
    ? { status: "published", liveVersion: expectedVersion, publishedAt: now, liveUpdatedAt: now }
    : { liveVersion: expectedVersion, liveUpdatedAt: now };
}

export const publish = (db: Db, t: Tables, a: { id: string; expectedVersion: number }, now: string) =>
  goLive(db, t, a.id, a.expectedVersion, now, true);
export const updateLive = (db: Db, t: Tables, a: { id: string; expectedVersion: number }, now: string) =>
  goLive(db, t, a.id, a.expectedVersion, now, false);

export async function regenerateToken(db: Db, tables: Tables, { id }: { id: string }) {
  const previewToken = randomBytes(16).toString("base64url");
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: "SET previewToken = :t",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: { ":t": previewToken },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw new PublishError("NotFound", "That invitation no longer exists.");
    throw err;
  }
  return { previewToken };
}
