import { GetCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DAY_MS, isIsoDate, PURGE_DAYS, todayIST } from "./rules";

export type Tables = { invitation: string; slug: string };
export type Db = Pick<DynamoDBDocumentClient, "send">;
type Args = { id: string; expectedVersion: number };
type DateArgs = Args & { offlineOn: string };

// AppSync reports a Lambda error's `name` as its errorType, which the website maps to a message.
export class LifecycleError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

export type Invitation = {
  id: string;
  status: string;
  version: number;
  slug?: string | null;
  statusBeforeDelete?: string | null;
  offlineOn?: string | null;
  purgeAt?: string | null;
};

// Strongly consistent, so a change saved just before is seen and not reported as a false conflict.
export async function load(db: Db, tables: Tables, id: string): Promise<Invitation> {
  const { Item } = await db.send(new GetCommand({ TableName: tables.invitation, Key: { id }, ConsistentRead: true }));
  if (!Item) throw new LifecycleError("NotFound", "That invitation no longer exists.");
  return Item as Invitation;
}

const conflict = () => new LifecycleError("VersionConflict", "Updated by someone else — reload");
const isConditionFailure = (err: any) => err?.name === "ConditionalCheckFailedException";
export const purgeAtFrom = (now: string) => new Date(Date.parse(now) + PURGE_DAYS * DAY_MS).toISOString();

/**
 * What an erase writes to purgeAt before it touches any file. The epoch is at or before every clock, so a restore
 * or put-back-online racing the erase fails `purgeAt > :now` whatever `now` it computed.
 */
export const ERASE_CLAIM = "1970-01-01T00:00:00.000Z";

/** True once the erase may have started: purgeAt has passed (the daily job), or was claimed (ERASE_CLAIM). */
const beingErased = (inv: Invitation, now: string) => typeof inv.purgeAt === "string" && inv.purgeAt <= now;

/**
 * Loads the invitation, checks its status and version, then writes one update conditioned on the exact version
 * and status it read, and on the erase not having started (purgeAt absent or still in the future; ISO strings
 * from toISOString compare correctly as strings). So a restore can never win a race against an erase that is
 * already deleting files. Staff transitions never change `version`: that counts content edits only.
 */
async function transition(
  db: Db,
  tables: Tables,
  { id, expectedVersion }: Args,
  from: string[],
  wrongStatus: string,
  now: string,
  build: (inv: Invitation) => { expr: string; values: Record<string, unknown> },
): Promise<Invitation> {
  const inv = await load(db, tables, id);
  if (!from.includes(inv.status)) throw new LifecycleError("WrongStatus", wrongStatus);
  if (inv.version !== expectedVersion) throw conflict();
  if (beingErased(inv, now)) throw new LifecycleError("WrongStatus", "This invitation is being erased");
  const { expr, values } = build(inv);
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: expr,
        ConditionExpression:
          "version = :v AND #status = :from AND (attribute_not_exists(purgeAt) OR attribute_type(purgeAt, :null) OR purgeAt > :now)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ...values, ":v": expectedVersion, ":from": inv.status, ":now": now, ":null": "NULL" },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw conflict();
    throw err;
  }
  return inv;
}

const afterToday = (d: unknown, now: string): d is string => isIsoDate(d) && d > todayIST(Date.parse(now));
const badFutureDate = () => new LifecycleError("BadDate", "Pick a date after today");

export async function takeOffline(db: Db, tables: Tables, args: Args, now: string) {
  const purgeAt = purgeAtFrom(now);
  await transition(db, tables, args, ["published"], "Only a live invitation can be taken offline.", now, () => ({
    expr: "SET #status = :offline, offlineAt = :now, purgeAt = :purge",
    values: { ":offline": "offline", ":purge": purgeAt },
  }));
  return { status: "offline", offlineAt: now, purgeAt };
}

export async function putOnline(db: Db, tables: Tables, args: DateArgs, now: string) {
  const { offlineOn } = args;
  if (!afterToday(offlineOn, now)) throw badFutureDate();
  await transition(db, tables, args, ["offline"], "Only an offline invitation can be put back online.", now, () => ({
    expr: "SET #status = :published, offlineOn = :d REMOVE offlineAt, purgeAt",
    values: { ":published": "published", ":d": offlineOn },
  }));
  return { status: "published", offlineOn };
}

export async function setOfflineOn(db: Db, tables: Tables, args: DateArgs, now: string) {
  const { offlineOn } = args;
  if (!isIsoDate(offlineOn) || offlineOn < todayIST(Date.parse(now))) {
    throw new LifecycleError("BadDate", "Pick today or a later date");
  }
  await transition(db, tables, args, ["published", "offline"], "Publish the invitation first.", now, () => ({
    expr: "SET offlineOn = :d",
    values: { ":d": offlineOn },
  }));
  return { offlineOn };
}

export async function remove(db: Db, tables: Tables, args: Args, now: string) {
  const purgeAt = purgeAtFrom(now);
  await transition(db, tables, args, ["draft", "published", "offline"], "This invitation is already deleted.", now, () => ({
    expr: "SET statusBeforeDelete = #status, #status = :deleted, deletedAt = :now, purgeAt = :purge",
    values: { ":deleted": "deleted", ":purge": purgeAt },
  }));
  return { status: "deleted", deletedAt: now, purgeAt };
}

const RESTORABLE = ["draft", "published", "offline"];

/**
 * Restoring to published needs an offline date after today, or the next nightly run would take it straight
 * offline again: `offlineOn` (optional) replaces the stored one in the same write. It is ignored for other targets.
 */
export async function restore(db: Db, tables: Tables, args: Args & { offlineOn?: string | null }, now: string) {
  let target = "draft";
  let purgeAt: string | null = null;
  await transition(db, tables, args, ["deleted"], "Only a deleted invitation can be restored.", now, (inv) => {
    target = RESTORABLE.includes(inv.statusBeforeDelete ?? "") ? inv.statusBeforeDelete! : "draft";
    if (target === "offline") {
      // Back offline: it gets a fresh 30 days before it is erased.
      purgeAt = purgeAtFrom(now);
      return {
        expr: "SET #status = :target, purgeAt = :purge REMOVE deletedAt, statusBeforeDelete",
        values: { ":target": target, ":purge": purgeAt },
      };
    }
    if (target === "published") {
      // A missing stored date (published before offline dates existed) counts as past: it needs a new one.
      const given = args.offlineOn != null;
      if (given && !afterToday(args.offlineOn, now)) throw badFutureDate();
      if (!given && !afterToday(inv.offlineOn, now)) throw badFutureDate();
      if (given) {
        return {
          expr: "SET #status = :target, offlineOn = :d REMOVE deletedAt, statusBeforeDelete, purgeAt",
          values: { ":target": target, ":d": args.offlineOn },
        };
      }
    }
    return { expr: "SET #status = :target REMOVE deletedAt, statusBeforeDelete, purgeAt", values: { ":target": target } };
  });
  return { status: target, purgeAt };
}

/**
 * Erase-now's first step: claims the row (purgeAt = ERASE_CLAIM), conditioned on the version and status just read.
 * From here restore and put-online are refused, so the erase that follows can't be undone halfway.
 */
export async function claimForErase(db: Db, tables: Tables, inv: Pick<Invitation, "id" | "version" | "status">) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id: inv.id },
        UpdateExpression: "SET purgeAt = :epoch",
        ConditionExpression: "version = :v AND #status = :from",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":epoch": ERASE_CLAIM, ":v": inv.version, ":from": inv.status },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw conflict();
    throw err;
  }
}

/**
 * The daily job's claim on a row it found erase-due, conditioned on the status and purgeAt it read. False when the
 * row was restored, deleted again with a fresh 30 days, or erased since: the job then leaves it alone.
 */
export async function claimDueForErase(db: Db, tables: Tables, row: Pick<Invitation, "id" | "status" | "purgeAt">) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id: row.id },
        UpdateExpression: "SET purgeAt = :epoch",
        ConditionExpression: "#status = :seenStatus AND purgeAt = :seen",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":epoch": ERASE_CLAIM, ":seenStatus": row.status, ":seen": row.purgeAt },
      }),
    );
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}
