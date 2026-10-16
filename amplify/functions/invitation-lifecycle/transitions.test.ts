import { describe, expect, it, vi } from "vitest";
import { claimForErase, LifecycleError, putOnline, remove, restore, setOfflineOn, takeOffline } from "./transitions";

const NOW = "2027-02-22T10:00:00.000Z"; // 15:30 IST on 22 Feb
const PURGE = "2027-03-24T10:00:00.000Z"; // NOW + 30 days
const tables = { invitation: "Inv", slug: "Slug" };
const ID = "inv-12345678";
const GUARD =
  "version = :v AND #status = :from AND (attribute_not_exists(purgeAt) OR attribute_type(purgeAt, :null) OR purgeAt > :now)";
const guardValues = (from: string) => ({ ":v": 7, ":from": from, ":now": NOW, ":null": "NULL" });

function fakeDb(item: Record<string, unknown> | undefined, opts: { failUpdate?: boolean } = {}) {
  const calls: any[] = [];
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      calls.push(cmd);
      const name = cmd.constructor.name;
      if (name === "GetCommand") return { Item: item };
      if (name === "UpdateCommand" && opts.failUpdate) {
        throw Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });
      }
      return { Attributes: {} };
    }),
  };
}
const update = (db: ReturnType<typeof fakeDb>) => db.calls.find((c) => c.constructor.name === "UpdateCommand")?.input;
const published = { id: ID, status: "published", version: 7, slug: "a-b", offlineOn: "2027-02-21" };
const offline = { ...published, status: "offline", offlineAt: "2027-02-21T21:30:00.000Z", purgeAt: "2027-03-23T21:30:00.000Z" };
const deleted = { ...published, offlineOn: "2027-03-01", status: "deleted", statusBeforeDelete: "published", deletedAt: NOW, purgeAt: PURGE };

describe("every transition", () => {
  it("reads strongly consistently, conditions on version and status, and never touches the version", async () => {
    const cases: [(db: any) => Promise<unknown>, Record<string, unknown>][] = [
      [(db) => takeOffline(db, tables, { id: ID, expectedVersion: 7 }, NOW), published],
      [(db) => putOnline(db, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-02-23" }, NOW), offline],
      [(db) => setOfflineOn(db, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-02-23" }, NOW), published],
      [(db) => remove(db, tables, { id: ID, expectedVersion: 7 }, NOW), published],
      [(db) => restore(db, tables, { id: ID, expectedVersion: 7 }, NOW), deleted],
    ];
    for (const [run, item] of cases) {
      const db = fakeDb(item);
      await run(db);
      const get = db.calls.find((c) => c.constructor.name === "GetCommand").input;
      expect(get).toEqual({ TableName: "Inv", Key: { id: ID }, ConsistentRead: true });
      const upd = update(db);
      expect(upd.TableName).toBe("Inv");
      expect(upd.Key).toEqual({ id: ID });
      expect(upd.ConditionExpression).toBe(GUARD);
      expect(upd.ExpressionAttributeNames).toEqual({ "#status": "status" });
      expect(upd.ExpressionAttributeValues).toMatchObject(guardValues(item.status as string));
      expect(upd.UpdateExpression).not.toMatch(/version/);
    }
  });
  it("is NotFound for a missing invitation", async () => {
    await expect(takeOffline(fakeDb(undefined) as any, tables, { id: ID, expectedVersion: 1 }, NOW)).rejects.toMatchObject({
      name: "NotFound",
    });
  });
  it("LifecycleError carries its name as the GraphQL errorType", () => {
    expect(new LifecycleError("BadDate", "x").name).toBe("BadDate");
  });
});

describe("takeOffline", () => {
  it("moves a published invitation offline and starts the 30-day clock", async () => {
    const db = fakeDb(published);
    await expect(takeOffline(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toEqual({
      status: "offline",
      offlineAt: NOW,
      purgeAt: PURGE,
    });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET #status = :offline, offlineAt = :now, purgeAt = :purge");
    expect(upd.ExpressionAttributeValues).toEqual({ ":offline": "offline", ":purge": PURGE, ...guardValues("published") });
  });
  it("is a conflict when the stored version moved on", async () => {
    const db = fakeDb({ ...published, version: 8 });
    await expect(takeOffline(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
    expect(update(db)).toBeUndefined();
  });
  it("is a conflict when the condition fails between read and write", async () => {
    const db = fakeDb(published, { failUpdate: true });
    await expect(takeOffline(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
  });
  it.each(["draft", "offline", "deleted"])("refuses a %s invitation", async (status) => {
    const db = fakeDb({ ...published, status });
    await expect(takeOffline(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({ name: "WrongStatus" });
    expect(update(db)).toBeUndefined();
  });
});

describe("putOnline", () => {
  it("brings an offline invitation back with a new offline date and stops the clock", async () => {
    const db = fakeDb(offline);
    await expect(putOnline(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW)).resolves.toEqual({
      status: "published",
      offlineOn: "2027-03-01",
    });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET #status = :published, offlineOn = :d REMOVE offlineAt, purgeAt");
    expect(upd.ExpressionAttributeValues).toEqual({ ":published": "published", ":d": "2027-03-01", ...guardValues("offline") });
  });
  it.each(["2027-02-22", "2027-02-21", "2027-2-23", "", "2027-02-30", null])("refuses offline date %j", async (offlineOn) => {
    const db = fakeDb(offline);
    await expect(
      putOnline(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: offlineOn as any }, NOW),
    ).rejects.toMatchObject({ name: "BadDate", message: "Pick a date after today" });
    expect(update(db)).toBeUndefined();
  });
  it("uses India's date, not UTC's", async () => {
    // 19:00 UTC on 22 Feb is already 23 Feb in India, so 23 Feb is "today" and refused.
    const db = fakeDb(offline);
    await expect(
      putOnline(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-02-23" }, "2027-02-22T19:00:00.000Z"),
    ).rejects.toMatchObject({ name: "BadDate" });
  });
  it("refuses a published invitation", async () => {
    const db = fakeDb(published);
    await expect(putOnline(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW)).rejects.toMatchObject({
      name: "WrongStatus",
    });
  });
  it("is a conflict when the stored version moved on", async () => {
    const db = fakeDb({ ...offline, version: 6 });
    await expect(putOnline(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW)).rejects.toMatchObject({
      name: "VersionConflict",
    });
  });
});

describe("setOfflineOn", () => {
  it.each([published, offline])("sets the date (today allowed) on a $status invitation", async (item) => {
    const db = fakeDb(item);
    await expect(setOfflineOn(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-02-22" }, NOW)).resolves.toEqual({
      offlineOn: "2027-02-22",
    });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET offlineOn = :d");
    expect(upd.ExpressionAttributeValues).toEqual({ ":d": "2027-02-22", ...guardValues(item.status) });
  });
  it.each(["2027-02-21", "nope", null])("refuses date %j", async (offlineOn) => {
    const db = fakeDb(published);
    await expect(
      setOfflineOn(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: offlineOn as any }, NOW),
    ).rejects.toMatchObject({ name: "BadDate" });
    expect(update(db)).toBeUndefined();
  });
  it.each(["draft", "deleted"])("refuses a %s invitation", async (status) => {
    const db = fakeDb({ ...published, status });
    await expect(setOfflineOn(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW)).rejects.toMatchObject({
      name: "WrongStatus",
    });
  });
  it("is a conflict when the condition fails", async () => {
    const db = fakeDb(published, { failUpdate: true });
    await expect(setOfflineOn(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW)).rejects.toMatchObject({
      name: "VersionConflict",
    });
  });
});

describe("remove", () => {
  it.each(["draft", "published", "offline"])("moves a %s invitation to deleted, remembering where it was", async (status) => {
    const db = fakeDb({ ...published, status });
    await expect(remove(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toEqual({
      status: "deleted",
      deletedAt: NOW,
      purgeAt: PURGE,
    });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET statusBeforeDelete = #status, #status = :deleted, deletedAt = :now, purgeAt = :purge");
    expect(upd.ExpressionAttributeValues).toEqual({ ":deleted": "deleted", ":purge": PURGE, ...guardValues(status) });
  });
  it("refuses an already deleted invitation", async () => {
    await expect(remove(fakeDb(deleted) as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({ name: "WrongStatus" });
  });
  it("is a conflict when the stored version moved on", async () => {
    await expect(remove(fakeDb({ ...published, version: 9 }) as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({
      name: "VersionConflict",
    });
  });
});

describe("restore", () => {
  it("restores to published and clears purgeAt", async () => {
    const db = fakeDb(deleted);
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toEqual({ status: "published", purgeAt: null });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET #status = :target REMOVE deletedAt, statusBeforeDelete, purgeAt");
    expect(upd.ExpressionAttributeValues).toEqual({ ":target": "published", ...guardValues("deleted") });
  });
  it("restores to offline with a fresh 30-day clock", async () => {
    const db = fakeDb({ ...deleted, statusBeforeDelete: "offline", purgeAt: "2027-02-25T00:00:00.000Z" });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toEqual({ status: "offline", purgeAt: PURGE });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET #status = :target, purgeAt = :purge REMOVE deletedAt, statusBeforeDelete");
    expect(upd.ExpressionAttributeValues).toEqual({ ":target": "offline", ":purge": PURGE, ...guardValues("deleted") });
  });
  it.each([undefined, null, "deleted", "weird"])("restores to draft when the earlier status is %j", async (statusBeforeDelete) => {
    const db = fakeDb({ ...deleted, statusBeforeDelete });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toEqual({ status: "draft", purgeAt: null });
    expect(update(db).ExpressionAttributeValues[":target"]).toBe("draft");
  });
  it("refuses an invitation that isn't deleted", async () => {
    await expect(restore(fakeDb(offline) as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({ name: "WrongStatus" });
  });
  it("is a conflict when the condition fails", async () => {
    await expect(
      restore(fakeDb(deleted, { failUpdate: true }) as any, tables, { id: ID, expectedVersion: 7 }, NOW),
    ).rejects.toMatchObject({ name: "VersionConflict" });
  });
});

describe("once purgeAt has passed, the row is being erased", () => {
  const passed = "2027-02-22T09:59:59.000Z";
  it.each([
    ["restore", (db: any) => restore(db, tables, { id: ID, expectedVersion: 7 }, NOW), { ...deleted, purgeAt: passed }],
    ["putOnline", (db: any) => putOnline(db, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW), { ...offline, purgeAt: passed }],
    ["remove", (db: any) => remove(db, tables, { id: ID, expectedVersion: 7 }, NOW), { ...offline, purgeAt: NOW }],
    ["setOfflineOn", (db: any) => setOfflineOn(db, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-03-01" }, NOW), { ...offline, purgeAt: passed }],
  ] as const)("refuses %s", async (_name, run, item) => {
    const db = fakeDb(item);
    await expect(run(db)).rejects.toMatchObject({ name: "WrongStatus", message: "This invitation is being erased" });
    expect(update(db)).toBeUndefined();
  });
  it("is refused by the condition when the erase claims the row between read and write", async () => {
    const db = fakeDb(deleted, { failUpdate: true });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
    expect(update(db).ConditionExpression).toBe(GUARD);
  });
});

describe("restore to published needs a future offline date", () => {
  it.each(["2027-02-22", "2027-02-21"])("refuses a stored offline date of %s (today or earlier)", async (offlineOn) => {
    const db = fakeDb({ ...deleted, offlineOn });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).rejects.toMatchObject({
      name: "BadDate",
      message: "Pick a date after today",
    });
    expect(update(db)).toBeUndefined();
  });
  it("accepts a new date in the same call and stores it", async () => {
    const db = fakeDb({ ...deleted, offlineOn: "2027-02-21" });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "2027-02-23" }, NOW)).resolves.toEqual({
      status: "published",
      purgeAt: null,
    });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET #status = :target, offlineOn = :d REMOVE deletedAt, statusBeforeDelete, purgeAt");
    expect(upd.ExpressionAttributeValues).toEqual({ ":target": "published", ":d": "2027-02-23", ...guardValues("deleted") });
  });
  it.each(["2027-02-22", "2027-02-31", "soon"])("refuses a new date of %j", async (offlineOn) => {
    const db = fakeDb(deleted);
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7, offlineOn }, NOW)).rejects.toMatchObject({ name: "BadDate" });
    expect(update(db)).toBeUndefined();
  });
  it("allows a published invitation that never had an offline date", async () => {
    const db = fakeDb({ ...deleted, offlineOn: null });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toMatchObject({ status: "published" });
  });
  it.each(["draft", "offline"])("skips the date check, and ignores a new date, when restoring to %s", async (statusBeforeDelete) => {
    const db = fakeDb({ ...deleted, statusBeforeDelete, offlineOn: "2027-01-01" });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7, offlineOn: "bad" }, NOW)).resolves.toMatchObject({
      status: statusBeforeDelete,
    });
    expect(update(db).UpdateExpression).not.toContain("offlineOn");
  });
});

describe("claimForErase", () => {
  it("sets purgeAt to now, conditioned on the version and status it read", async () => {
    const db = fakeDb(offline);
    await claimForErase(db as any, tables, { id: ID, version: 7, status: "offline" }, NOW);
    expect(update(db)).toEqual({
      TableName: "Inv",
      Key: { id: ID },
      UpdateExpression: "SET purgeAt = :now",
      ConditionExpression: "version = :v AND #status = :from",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":now": NOW, ":v": 7, ":from": "offline" },
    });
  });
  it("is a conflict when the row changed since it was read", async () => {
    const db = fakeDb(offline, { failUpdate: true });
    await expect(claimForErase(db as any, tables, { id: ID, version: 7, status: "offline" }, NOW)).rejects.toMatchObject({
      name: "VersionConflict",
    });
  });
});
