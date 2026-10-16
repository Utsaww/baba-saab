import { describe, expect, it, vi } from "vitest";
import { publish, regenerateToken, setSlug, updateLive, PublishError } from "./publish";

const NOW = "2026-10-14T10:00:00.000Z";
const tables = { invitation: "Inv", slug: "Slug" };
function fakeDb(item: Record<string, unknown> | undefined, opts: { failTransact?: number } = {}) {
  const calls: any[] = [];
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      calls.push(cmd);
      const name = cmd.constructor.name;
      if (name === "GetCommand") return { Item: item };
      if (name === "TransactWriteCommand" && opts.failTransact !== undefined) {
        const reasons = cmd.input.TransactItems.map((_: unknown, i: number) => ({
          Code: i === opts.failTransact ? "ConditionalCheckFailed" : "None",
        }));
        throw Object.assign(new Error("cancelled"), { name: "TransactionCanceledException", CancellationReasons: reasons });
      }
      if (name === "UpdateCommand" && opts.failTransact === -1) {
        throw Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });
      }
      return { Attributes: {} };
    }),
  };
}
const draft = { id: "inv-1", status: "draft", version: 4, slug: "old-name", content: '{"a":1}' };

describe("setSlug", () => {
  it("claims the new slug, points the invitation at it and releases the old one in one transaction", async () => {
    const db = fakeDb(draft);
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "priya-weds-rahul" }, NOW)).resolves.toEqual({ slug: "priya-weds-rahul" });
    const tx = db.calls.find((c) => c.constructor.name === "TransactWriteCommand").input.TransactItems;
    expect(tx[0].Put.TableName).toBe("Slug");
    expect(tx[0].Put.Item).toMatchObject({ slug: "priya-weds-rahul", invitationId: "inv-1", __typename: "InvitationSlug" });
    expect(tx[0].Put.ConditionExpression).toBe("attribute_not_exists(slug)");
    expect(tx[1].Update.ConditionExpression).toContain("#status = :draft");
    expect(tx[2].Delete).toMatchObject({ TableName: "Slug", Key: { slug: "old-name" } });
  });
  it("does nothing when the slug is unchanged", async () => {
    const db = fakeDb(draft);
    await setSlug(db as any, tables, { id: "inv-1", slug: "old-name" }, NOW);
    expect(db.calls.some((c) => c.constructor.name === "TransactWriteCommand")).toBe(false);
  });
  it("reports a taken slug", async () => {
    const db = fakeDb(draft, { failTransact: 0 });
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "taken-name" }, NOW)).rejects.toMatchObject({ name: "SlugTaken" });
  });
  it("refuses once published", async () => {
    const db = fakeDb({ ...draft, status: "published" });
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "new-name" }, NOW)).rejects.toMatchObject({ name: "NotDraft" });
  });
  it("rejects an invalid slug before touching the database", async () => {
    const db = fakeDb(draft);
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "Bad Slug" }, NOW)).rejects.toMatchObject({ name: "InvalidSlug" });
    expect(db.send).not.toHaveBeenCalled();
  });
});

describe("publish", () => {
  it("copies the approved version's content live, conditioned on that version", async () => {
    const db = fakeDb(draft);
    const result = await publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW);
    expect(result).toEqual({ status: "published", liveVersion: 4, publishedAt: NOW, liveUpdatedAt: NOW });
    const upd = db.calls.find((c) => c.constructor.name === "UpdateCommand").input;
    expect(upd.ExpressionAttributeValues).toMatchObject({ ":content": '{"a":1}', ":v": 4, ":draft": "draft", ":published": "published" });
    expect(upd.ConditionExpression).toBe("version = :v AND #status = :draft");
  });
  it("is a conflict when the stored version moved on", async () => {
    const db = fakeDb({ ...draft, version: 5 });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
  });
  it("is a conflict when a save lands between read and write", async () => {
    const db = fakeDb(draft, { failTransact: -1 });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
  });
  it("reads the invitation strongly consistently, so a save made just before is seen", async () => {
    const db = fakeDb(draft);
    await publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW);
    await setSlug(db as any, tables, { id: "inv-1", slug: "new-name" }, NOW);
    const gets = db.calls.filter((c) => c.constructor.name === "GetCommand");
    expect(gets).toHaveLength(2);
    for (const get of gets) expect(get.input.ConsistentRead).toBe(true);
  });
  it("stores the offline date on first publish when given", async () => {
    const db = fakeDb(draft);
    await publish(db as any, tables, { id: "inv-1", expectedVersion: 4, offlineOn: "2027-02-22" }, NOW);
    const upd = db.calls.find((c) => c.constructor.name === "UpdateCommand").input;
    expect(upd.UpdateExpression).toBe(
      "SET publishedContent = :content, liveVersion = :v, #status = :published, publishedAt = :now, liveUpdatedAt = :now, offlineOn = :off",
    );
    expect(upd.ExpressionAttributeValues[":off"]).toBe("2027-02-22");
  });
  it.each([undefined, null, "", "22/02/2027", "2027-02-30"])("leaves the offline date out when it is %j", async (offlineOn) => {
    const db = fakeDb(draft);
    await publish(db as any, tables, { id: "inv-1", expectedVersion: 4, offlineOn: offlineOn as any }, NOW);
    const upd = db.calls.find((c) => c.constructor.name === "UpdateCommand").input;
    expect(upd.UpdateExpression).not.toContain("offlineOn");
    expect(upd.ExpressionAttributeValues).not.toHaveProperty(":off");
  });
  it("needs a slug", async () => {
    const db = fakeDb({ ...draft, slug: null });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "NoSlug" });
  });
  it("refuses an already published invitation", async () => {
    const db = fakeDb({ ...draft, status: "published" });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "NotDraft" });
  });
});

describe("updateLive", () => {
  it("pushes the current content live for a published invitation", async () => {
    const db = fakeDb({ ...draft, status: "published", version: 9 });
    await expect(updateLive(db as any, tables, { id: "inv-1", expectedVersion: 9 }, NOW)).resolves.toEqual({ liveVersion: 9, liveUpdatedAt: NOW });
  });
  it("is a conflict when the stored version moved on", async () => {
    const db = fakeDb({ ...draft, status: "published", version: 10 });
    await expect(updateLive(db as any, tables, { id: "inv-1", expectedVersion: 9 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
  });
  it("refuses a draft", async () => {
    const db = fakeDb(draft);
    await expect(updateLive(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "NotPublished" });
  });
});

describe("regenerateToken", () => {
  it("stores and returns a fresh 22-char token", async () => {
    const db = fakeDb(draft);
    const { previewToken } = await regenerateToken(db as any, tables, { id: "inv-1" });
    expect(previewToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const upd = db.calls.find((c) => c.constructor.name === "UpdateCommand").input;
    expect(upd.ExpressionAttributeValues[":t"]).toBe(previewToken);
    expect(upd.ConditionExpression).toBe("attribute_exists(id)");
  });
});

it("PublishError carries its name as the GraphQL errorType", () => {
  expect(new PublishError("SlugTaken", "x").name).toBe("SlugTaken");
});
