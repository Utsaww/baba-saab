import { GetCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { addDays, DAY_MS, ISO_DATE, PURGE_DAYS, todayIST } from "./rules";

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
// A real calendar date: the regex alone would accept 2027-02-30.
const isDate = (d: unknown): d is string => typeof d === "string" && ISO_DATE.test(d) && addDays(d, 0) === d;

/**
 * Loads the invitation, checks its status and version, then writes one update conditioned on the
 * exact version and status it read. Staff transitions never change `version`: that counts content edits only.
 */
async function transition(
  db: Db,
  tables: Tables,
  { id, expectedVersion }: Args,
  from: string[],
  wrongStatus: string,
  build: (inv: Invitation) => { expr: string; values: Record<string, unknown> },
): Promise<Invitation> {
  const inv = await load(db, tables, id);
  if (!from.includes(inv.status)) throw new LifecycleError("WrongStatus", wrongStatus);
  if (inv.version !== expectedVersion) throw conflict();
  const { expr, values } = build(inv);
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: expr,
        ConditionExpression: "version = :v AND #status = :from",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ...values, ":v": expectedVersion, ":from": inv.status },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw conflict();
    throw err;
  }
  return inv;
}

export async function takeOffline(db: Db, tables: Tables, args: Args, now: string) {
  const purgeAt = purgeAtFrom(now);
  await transition(db, tables, args, ["published"], "Only a live invitation can be taken offline.", () => ({
    expr: "SET #status = :offline, offlineAt = :now, purgeAt = :purge",
    values: { ":offline": "offline", ":now": now, ":purge": purgeAt },
  }));
  return { status: "offline", offlineAt: now, purgeAt };
}

export async function putOnline(db: Db, tables: Tables, args: DateArgs, now: string) {
  const { offlineOn } = args;
  if (!isDate(offlineOn) || offlineOn <= todayIST(Date.parse(now))) {
    throw new LifecycleError("BadDate", "Pick a date after today");
  }
  await transition(db, tables, args, ["offline"], "Only an offline invitation can be put back online.", () => ({
    expr: "SET #status = :published, offlineOn = :d REMOVE offlineAt, purgeAt",
    values: { ":published": "published", ":d": offlineOn },
  }));
  return { status: "published", offlineOn };
}

export async function setOfflineOn(db: Db, tables: Tables, args: DateArgs, now: string) {
  const { offlineOn } = args;
  if (!isDate(offlineOn) || offlineOn < todayIST(Date.parse(now))) {
    throw new LifecycleError("BadDate", "Pick today or a later date");
  }
  await transition(db, tables, args, ["published", "offline"], "Publish the invitation first.", () => ({
    expr: "SET offlineOn = :d",
    values: { ":d": offlineOn },
  }));
  return { offlineOn };
}

export async function remove(db: Db, tables: Tables, args: Args, now: string) {
  const purgeAt = purgeAtFrom(now);
  await transition(db, tables, args, ["draft", "published", "offline"], "This invitation is already deleted.", () => ({
    expr: "SET statusBeforeDelete = #status, #status = :deleted, deletedAt = :now, purgeAt = :purge",
    values: { ":deleted": "deleted", ":now": now, ":purge": purgeAt },
  }));
  return { status: "deleted", deletedAt: now, purgeAt };
}

const RESTORABLE = ["draft", "published", "offline"];

export async function restore(db: Db, tables: Tables, args: Args, now: string) {
  let target = "draft";
  let purgeAt: string | null = null;
  await transition(db, tables, args, ["deleted"], "Only a deleted invitation can be restored.", (inv) => {
    target = RESTORABLE.includes(inv.statusBeforeDelete ?? "") ? inv.statusBeforeDelete! : "draft";
    if (target === "offline") {
      // Back offline: it gets a fresh 30 days before it is erased.
      purgeAt = purgeAtFrom(now);
      return {
        expr: "SET #status = :target, purgeAt = :purge REMOVE deletedAt, statusBeforeDelete",
        values: { ":target": target, ":purge": purgeAt },
      };
    }
    return { expr: "SET #status = :target REMOVE deletedAt, statusBeforeDelete, purgeAt", values: { ":target": target } };
  });
  return { status: target, purgeAt };
}
