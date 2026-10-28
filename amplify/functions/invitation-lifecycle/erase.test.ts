import { describe, expect, it, vi } from "vitest";
import { eraseInvitation } from "./erase";

const cfg = { tables: { invitation: "Inv", slug: "Slug", rsvp: "Rsvp" }, bucket: "media-bucket" };
const ID = "0f8e2c6a-1b2c-4d5e-8f90-123456789abc";
const P = `invitations/${ID}/`;
const NOW = "2027-03-30T21:30:00.000Z";
const condFail = () => Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });

function fakes(
  pages: { keys: string[]; next?: string }[],
  opts: {
    failS3?: boolean;
    failSlug?: boolean;
    failRecord?: boolean;
    s3Errors?: { Key: string; Code: string }[];
    rsvpPages?: { keys: string[]; next?: boolean }[];
    unprocessed?: number[]; // per BatchWrite call: how many of its deletes come back unprocessed
    failBatch?: boolean;
  } = {},
) {
  const log: string[] = [];
  const s3Calls: any[] = [];
  const dbCalls: any[] = [];
  let page = 0;
  let rsvpPage = 0;
  let batch = 0;
  const s3 = {
    send: vi.fn(async (cmd: any) => {
      s3Calls.push(cmd);
      log.push(cmd.constructor.name);
      if (opts.failS3) throw new Error("AccessDenied");
      if (cmd.constructor.name === "ListObjectsV2Command") {
        const p = pages[page++] ?? { keys: [] };
        return { Contents: p.keys.map((Key) => ({ Key })), IsTruncated: !!p.next, NextContinuationToken: p.next };
      }
      return opts.s3Errors ? { Errors: opts.s3Errors } : {};
    }),
  };
  const db = {
    send: vi.fn(async (cmd: any) => {
      dbCalls.push(cmd);
      const name = cmd.constructor.name;
      if (name === "BatchWriteCommand") {
        const reqs = cmd.input.RequestItems.Rsvp;
        log.push(`BatchWriteCommand:${reqs.length}`);
        if (opts.failBatch) throw new Error("AccessDeniedException");
        const n = opts.unprocessed?.[batch++] ?? 0;
        return n ? { UnprocessedItems: { Rsvp: reqs.slice(0, n) } } : { UnprocessedItems: {} };
      }
      log.push(`${name}:${cmd.input.TableName}`);
      if (name === "QueryCommand") {
        const p = opts.rsvpPages?.[rsvpPage++] ?? { keys: [] };
        return {
          Items: p.keys.map((rsvpKey) => ({ invitationId: ID, rsvpKey })),
          LastEvaluatedKey: p.next ? { invitationId: ID, rsvpKey: p.keys.at(-1) } : undefined,
        };
      }
      if (cmd.input.TableName === "Slug" && opts.failSlug) throw condFail();
      if (cmd.input.TableName === "Inv" && opts.failRecord) throw condFail();
      return {};
    }),
  };
  return { s3, db, s3Calls, dbCalls, log };
}

describe("eraseInvitation", () => {
  it("lists exactly the invitation's own folder, deletes its files, then the link name, then the record", async () => {
    const f = fakes([{ keys: [`${P}photo-1.jpg`, `${P}music.mp3`] }]);
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "priya-weds-rahul" }, NOW)).resolves.toBe(true);
    expect(f.s3Calls[0].input).toEqual({ Bucket: "media-bucket", Prefix: P, ContinuationToken: undefined });
    expect(f.s3Calls[1].input).toEqual({
      Bucket: "media-bucket",
      Delete: { Objects: [{ Key: `${P}photo-1.jpg` }, { Key: `${P}music.mp3` }], Quiet: true },
    });
    expect(f.log).toEqual([
      "ListObjectsV2Command",
      "DeleteObjectsCommand",
      "QueryCommand:Rsvp",
      "DeleteCommand:Slug",
      "DeleteCommand:Inv",
    ]);
    expect(f.dbCalls[1].input).toEqual({
      TableName: "Slug",
      Key: { slug: "priya-weds-rahul" },
      ConditionExpression: "invitationId = :id",
      ExpressionAttributeValues: { ":id": ID },
    });
    expect(f.dbCalls[2].input).toMatchObject({
      TableName: "Inv",
      Key: { id: ID },
      ConditionExpression: "#status IN (:offline, :deleted) AND purgeAt <= :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":offline": "offline", ":deleted": "deleted", ":now": NOW },
    });
  });
  it("never deletes a key outside the folder, even if the listing returns one", async () => {
    const f = fakes([{ keys: [`${P}a.jpg`, "invitations/other-id/b.jpg", "music-library/c.mp3"] }]);
    await eraseInvitation(f, cfg, { id: ID }, NOW);
    expect(f.s3Calls[1].input.Delete.Objects).toEqual([{ Key: `${P}a.jpg` }]);
  });
  it("pages through a long listing", async () => {
    const f = fakes([{ keys: [`${P}1.jpg`], next: "tok-2" }, { keys: [`${P}2.jpg`] }]);
    await eraseInvitation(f, cfg, { id: ID }, NOW);
    const lists = f.s3Calls.filter((c) => c.constructor.name === "ListObjectsV2Command");
    expect(lists.map((c) => c.input.ContinuationToken)).toEqual([undefined, "tok-2"]);
    const deletes = f.s3Calls.filter((c) => c.constructor.name === "DeleteObjectsCommand");
    expect(deletes.map((c) => c.input.Delete.Objects)).toEqual([[{ Key: `${P}1.jpg` }], [{ Key: `${P}2.jpg` }]]);
  });
  it("skips the delete call for an empty page and without a slug", async () => {
    const f = fakes([{ keys: [] }]);
    await eraseInvitation(f, cfg, { id: ID, slug: null }, NOW);
    expect(f.log).toEqual(["ListObjectsV2Command", "QueryCommand:Rsvp", "DeleteCommand:Inv"]);
  });
  it.each(["", "../x", "a/b", "short", "abc12345/..", "*", "inv 12345678"])("refuses unsafe id %j without touching anything", async (id) => {
    const f = fakes([{ keys: [`${P}a.jpg`] }]);
    await expect(eraseInvitation(f, cfg, { id }, NOW)).rejects.toThrow(/refusing to erase unsafe id/);
    expect(f.s3.send).not.toHaveBeenCalled();
    expect(f.db.send).not.toHaveBeenCalled();
  });
  it("is fine when the link name was already released or reused", async () => {
    const f = fakes([{ keys: [] }], { failSlug: true });
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).resolves.toBe(true);
    expect(f.log.at(-1)).toBe("DeleteCommand:Inv");
  });
  it("is fine when the record was already erased (or restored meanwhile)", async () => {
    const f = fakes([{ keys: [] }], { failRecord: true });
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith("lifecycle: record not erased (changed or already gone)", ID);
    log.mockRestore();
  });
  it("stops before any database delete when S3 fails", async () => {
    const f = fakes([{ keys: [`${P}a.jpg`] }], { failS3: true });
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).rejects.toThrow("AccessDenied");
    expect(f.db.send).not.toHaveBeenCalled();
  });
  it("throws on per-key S3 delete failures before touching the link name or record", async () => {
    const f = fakes([{ keys: [`${P}a.jpg`, `${P}b.jpg`] }], { s3Errors: [{ Key: `${P}b.jpg`, Code: "AccessDenied" }] });
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).rejects.toThrow(
      `S3 delete failed for 1 key(s): ${P}b.jpg AccessDenied`,
    );
    expect(f.db.send).not.toHaveBeenCalled();
  });
  it("passes on unexpected database errors", async () => {
    const f = fakes([{ keys: [] }]);
    f.db.send.mockRejectedValueOnce(new Error("ProvisionedThroughputExceeded"));
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).rejects.toThrow("ProvisionedThroughputExceeded");
  });

  it("deletes every RSVP of the invitation, page by page in batches of 25, before the link name and record", async () => {
    const keys = (from: number, n: number) => Array.from({ length: n }, (_, i) => `91900000${String(from + i).padStart(4, "0")}#g`);
    const f = fakes([{ keys: [] }], { rsvpPages: [{ keys: keys(0, 30), next: true }, { keys: keys(30, 5) }] });
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).resolves.toBe(true);
    expect(f.log).toEqual([
      "ListObjectsV2Command",
      "QueryCommand:Rsvp",
      "BatchWriteCommand:25",
      "BatchWriteCommand:5",
      "QueryCommand:Rsvp",
      "BatchWriteCommand:5",
      "DeleteCommand:Slug",
      "DeleteCommand:Inv",
    ]);
    const queries = f.dbCalls.filter((c) => c.constructor.name === "QueryCommand").map((c) => c.input);
    expect(queries[0]).toEqual({
      TableName: "Rsvp",
      KeyConditionExpression: "invitationId = :id",
      ExpressionAttributeValues: { ":id": ID },
      ProjectionExpression: "invitationId, rsvpKey",
      ConsistentRead: true,
      ExclusiveStartKey: undefined,
    });
    expect(queries[1].ExclusiveStartKey).toEqual({ invitationId: ID, rsvpKey: keys(0, 30).at(-1) });
    const deleted = f.dbCalls
      .filter((c) => c.constructor.name === "BatchWriteCommand")
      .flatMap((c) => c.input.RequestItems.Rsvp.map((r: any) => r.DeleteRequest.Key));
    expect(deleted).toEqual([...keys(0, 30), ...keys(30, 5)].map((rsvpKey) => ({ invitationId: ID, rsvpKey })));
  });
  it("retries deletes DynamoDB left unprocessed", async () => {
    const f = fakes([{ keys: [] }], { rsvpPages: [{ keys: ["1#a", "2#b", "3#c"] }], unprocessed: [2, 0] });
    await expect(eraseInvitation(f, cfg, { id: ID }, NOW)).resolves.toBe(true);
    const batches = f.dbCalls.filter((c) => c.constructor.name === "BatchWriteCommand").map((c) => c.input.RequestItems.Rsvp);
    expect(batches.map((b) => b.length)).toEqual([3, 2]);
    expect(batches[1].map((r: any) => r.DeleteRequest.Key.rsvpKey)).toEqual(["1#a", "2#b"]);
  });
  it("throws before the link name and record when RSVP deletes keep coming back unprocessed", async () => {
    const f = fakes([{ keys: [] }], { rsvpPages: [{ keys: ["1#a"] }], unprocessed: [1, 1, 1, 1, 1, 1, 1, 1] });
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).rejects.toThrow(/RSVP delete left 1 unprocessed/);
    expect(f.log.some((l) => l.startsWith("DeleteCommand"))).toBe(false);
  });
  it("throws before the link name and record when an RSVP delete fails, so the next run retries", async () => {
    const f = fakes([{ keys: [] }], { rsvpPages: [{ keys: ["1#a"] }], failBatch: true });
    await expect(eraseInvitation(f, cfg, { id: ID, slug: "a-b" }, NOW)).rejects.toThrow("AccessDeniedException");
    expect(f.log.some((l) => l.startsWith("DeleteCommand"))).toBe(false);
  });
});
