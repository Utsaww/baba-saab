import { describe, expect, it, vi } from "vitest";
import { LifecycleError, putOnline, remove, restore, setOfflineOn, takeOffline } from "./transitions";

const NOW = "2027-02-22T10:00:00.000Z"; // 15:30 IST on 22 Feb
const PURGE = "2027-03-24T10:00:00.000Z"; // NOW + 30 days
const tables = { invitation: "Inv", slug: "Slug" };
const ID = "inv-12345678";

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
const deleted = { ...published, status: "deleted", statusBeforeDelete: "published", deletedAt: NOW, purgeAt: PURGE };

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
      expect(upd.ConditionExpression).toBe("version = :v AND #status = :from");
      expect(upd.ExpressionAttributeNames).toEqual({ "#status": "status" });
      expect(upd.ExpressionAttributeValues).toMatchObject({ ":v": 7, ":from": item.status });
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
    expect(upd.ExpressionAttributeValues).toEqual({ ":offline": "offline", ":now": NOW, ":purge": PURGE, ":from": "published", ":v": 7 });
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
    expect(upd.ExpressionAttributeValues).toEqual({ ":published": "published", ":d": "2027-03-01", ":from": "offline", ":v": 7 });
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
    expect(upd.ExpressionAttributeValues).toEqual({ ":d": "2027-02-22", ":from": item.status, ":v": 7 });
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
    expect(upd.ExpressionAttributeValues).toEqual({ ":deleted": "deleted", ":now": NOW, ":purge": PURGE, ":from": status, ":v": 7 });
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
    expect(upd.ExpressionAttributeValues).toEqual({ ":target": "published", ":from": "deleted", ":v": 7 });
  });
  it("restores to offline with a fresh 30-day clock", async () => {
    const db = fakeDb({ ...deleted, statusBeforeDelete: "offline", purgeAt: "2027-02-25T00:00:00.000Z" });
    await expect(restore(db as any, tables, { id: ID, expectedVersion: 7 }, NOW)).resolves.toEqual({ status: "offline", purgeAt: PURGE });
    const upd = update(db);
    expect(upd.UpdateExpression).toBe("SET #status = :target, purgeAt = :purge REMOVE deletedAt, statusBeforeDelete");
    expect(upd.ExpressionAttributeValues).toEqual({ ":target": "offline", ":purge": PURGE, ":from": "deleted", ":v": 7 });
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
