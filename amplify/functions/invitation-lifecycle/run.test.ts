import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./erase", () => ({ eraseInvitation: vi.fn(async () => true) }));

import { eraseInvitation } from "./erase";
import { runLifecycle } from "./run";

const NOW = new Date("2027-02-21T21:30:00.000Z"); // 03:00 IST on 22 Feb
const cfg = { tables: { invitation: "Inv", slug: "Slug" }, bucket: "media-bucket" };
const condFail = () => Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });

const due = { id: "inv-due-0001", status: "published", version: 3, slug: "due", offlineOn: "2027-02-22" };
const notYet = { id: "inv-later-01", status: "published", version: 3, slug: "later", offlineOn: "2027-02-23" };
const old = { id: "inv-old-0001", status: "offline", version: 2, slug: "old", purgeAt: "2027-02-20T00:00:00.000Z" };
const gone = { id: "inv-gone-001", status: "deleted", version: 5, slug: null, purgeAt: "2027-02-21T21:00:00.000Z" };

type Rows = Record<string, unknown>[];
function fakeDb(pages: Rows[], opts: { failUpdate?: (id: string) => boolean; fresh?: (id: string) => unknown } = {}) {
  const calls: any[] = [];
  const all = pages.flat();
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      calls.push(cmd);
      const name = cmd.constructor.name;
      const input = cmd.input;
      if (name === "ScanCommand") {
        const i = input.ExclusiveStartKey ? Number(input.ExclusiveStartKey.page) : 0;
        return { Items: pages[i], LastEvaluatedKey: i + 1 < pages.length ? { page: String(i + 1) } : undefined };
      }
      if (name === "GetCommand") {
        const id = input.Key.id;
        return { Item: opts.fresh ? opts.fresh(id) : all.find((r) => r.id === id) };
      }
      if (name === "UpdateCommand" && opts.failUpdate?.(input.Key.id)) throw condFail();
      return {};
    }),
  };
}
const s3 = { send: vi.fn() };
const updates = (db: ReturnType<typeof fakeDb>) => db.calls.filter((c) => c.constructor.name === "UpdateCommand").map((c) => c.input);

describe("runLifecycle", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let err: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.mocked(eraseInvitation).mockReset().mockResolvedValue(true);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    err = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("scans consistently with only the fields it needs", async () => {
    const db = fakeDb([[]]);
    await runLifecycle({ db, s3 } as any, cfg, NOW);
    expect(db.calls[0].input).toEqual({
      TableName: "Inv",
      ProjectionExpression: "id, #status, version, slug, offlineOn, purgeAt, publishedContent, content",
      ExpressionAttributeNames: { "#status": "status" },
      ConsistentRead: true,
      ExclusiveStartKey: undefined,
    });
  });

  it("takes a due published row offline, conditioned on what it read", async () => {
    const db = fakeDb([[due]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 1, backfilled: 0, erased: 0, skipped: 0, failed: 0 });
    expect(updates(db)).toEqual([
      {
        TableName: "Inv",
        Key: { id: "inv-due-0001" },
        UpdateExpression: "SET #status = :offline, offlineAt = :now, purgeAt = :purge",
        ConditionExpression: "#status = :published AND offlineOn = :seen",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":offline": "offline",
          ":published": "published",
          ":seen": "2027-02-22",
          ":now": "2027-02-21T21:30:00.000Z",
          ":purge": "2027-03-23T21:30:00.000Z",
        },
      },
    ]);
  });

  it("leaves a row that isn't due yet, and live or draft rows alone", async () => {
    const db = fakeDb([[notYet, { id: "inv-draft-01", status: "draft", version: 1 }]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 0, skipped: 0, failed: 0 });
    expect(updates(db)).toEqual([]);
    expect(eraseInvitation).not.toHaveBeenCalled();
  });

  it("skips a row changed between scan and write without counting a failure", async () => {
    const db = fakeDb([[due]], { failUpdate: () => true });
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 0, skipped: 0, failed: 0 });
    expect(err).not.toHaveBeenCalled();
  });

  it("erases offline and deleted rows past purgeAt", async () => {
    const db = fakeDb([[old, gone]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 2, skipped: 0, failed: 0 });
    expect(eraseInvitation).toHaveBeenCalledWith({ db, s3 }, cfg, { id: "inv-old-0001", slug: "old" }, "2027-02-21T21:30:00.000Z");
    expect(eraseInvitation).toHaveBeenCalledWith({ db, s3 }, cfg, { id: "inv-gone-001", slug: null }, "2027-02-21T21:30:00.000Z");
  });

  it("claims each due row (purgeAt = the epoch), conditioned on the status and purgeAt it read, before erasing", async () => {
    const db = fakeDb([[old]]);
    await runLifecycle({ db, s3 } as any, cfg, NOW);
    expect(updates(db)).toEqual([
      {
        TableName: "Inv",
        Key: { id: "inv-old-0001" },
        UpdateExpression: "SET purgeAt = :epoch",
        ConditionExpression: "#status = :seenStatus AND purgeAt = :seen",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":epoch": "1970-01-01T00:00:00.000Z", ":seenStatus": "offline", ":seen": "2027-02-20T00:00:00.000Z" },
      },
    ]);
    const claim = db.send.mock.invocationCallOrder[db.calls.findIndex((c) => c.constructor.name === "UpdateCommand")];
    expect(claim).toBeLessThan(vi.mocked(eraseInvitation).mock.invocationCallOrder[0]);
  });

  it("skips a due row whose claim fails (restored, deleted again or gone since the scan)", async () => {
    const db = fakeDb([[old, gone]], { failUpdate: (id) => id === "inv-old-0001" });
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 1, skipped: 1, failed: 0 });
    expect(eraseInvitation).toHaveBeenCalledTimes(1);
    expect(eraseInvitation).toHaveBeenCalledWith({ db, s3 }, cfg, { id: "inv-gone-001", slug: null }, "2027-02-21T21:30:00.000Z");
    expect(err).not.toHaveBeenCalled();
  });

  it("counts a row as skipped, not erased, when its record delete fails its condition", async () => {
    vi.mocked(eraseInvitation).mockResolvedValueOnce(false);
    const db = fakeDb([[old, gone]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 1, skipped: 1, failed: 0 });
    expect(err).not.toHaveBeenCalled();
  });

  it("counts an erase failure, logs it and carries on with the next row", async () => {
    const boom = new Error("AccessDenied");
    vi.mocked(eraseInvitation).mockRejectedValueOnce(boom);
    const db = fakeDb([[old, gone, due]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 1, backfilled: 0, erased: 1, skipped: 0, failed: 1 });
    expect(err).toHaveBeenCalledWith("lifecycle: erase failed", "inv-old-0001", boom);
  });

  it("counts an unexpected offline-write failure and carries on", async () => {
    const db = fakeDb([[due, old]]);
    const send = db.send.getMockImplementation()!;
    db.send.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name === "UpdateCommand" && cmd.input.Key.id === "inv-due-0001") throw new Error("Throttled");
      return send(cmd);
    });
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 1, skipped: 0, failed: 1 });
    expect(err).toHaveBeenCalledWith("lifecycle: offline failed", "inv-due-0001", expect.any(Error));
  });

  it("pages through the whole table", async () => {
    const db = fakeDb([[due], [old], [gone]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 1, backfilled: 0, erased: 2, skipped: 0, failed: 0 });
    const scans = db.calls.filter((c) => c.constructor.name === "ScanCommand").map((c) => c.input.ExclusiveStartKey);
    expect(scans).toEqual([undefined, { page: "1" }, { page: "2" }]);
  });

  describe("published rows from before Phase 5 (no offlineOn)", () => {
    // NOW is 03:00 IST on 22 Feb, so tomorrow is 23 Feb.
    const legacy = (over: Record<string, unknown> = {}) => ({
      id: "inv-legacy-01",
      status: "published",
      version: 4,
      slug: "legacy",
      publishedContent: { mainDate: "2027-03-01", events: [{ date: "2027-03-02" }] },
      content: { mainDate: "2027-04-01" },
      ...over,
    });
    const backfillOf = (offlineOn: string) => ({
      TableName: "Inv",
      Key: { id: "inv-legacy-01" },
      UpdateExpression: "SET offlineOn = :d",
      ConditionExpression: "#status = :published AND (attribute_not_exists(offlineOn) OR attribute_type(offlineOn, :null))",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":d": offlineOn, ":published": "published", ":null": "NULL" },
    });

    it("sets offlineOn from the live content's dates + 7", async () => {
      const db = fakeDb([[legacy()]]);
      await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 1, erased: 0, skipped: 0, failed: 0 });
      expect(updates(db)).toEqual([backfillOf("2027-03-09")]);
    });
    it("backfills a null offlineOn too, and reads AWSJSON stored as a string", async () => {
      const db = fakeDb([[legacy({ offlineOn: null, publishedContent: JSON.stringify({ mainDate: "2027-03-01" }) })]]);
      await runLifecycle({ db, s3 } as any, cfg, NOW);
      expect(updates(db)).toEqual([backfillOf("2027-03-08")]);
    });
    it("falls back to the draft content when there is no live content", async () => {
      const db = fakeDb([[legacy({ publishedContent: undefined })]]);
      await runLifecycle({ db, s3 } as any, cfg, NOW);
      expect(updates(db)).toEqual([backfillOf("2027-04-08")]);
    });
    it("never sets a date before tomorrow, so a wedding long past isn't taken offline that night", async () => {
      const db = fakeDb([[legacy({ publishedContent: { mainDate: "2026-01-01" } })]]);
      await runLifecycle({ db, s3 } as any, cfg, NOW);
      expect(updates(db)).toEqual([backfillOf("2027-02-23")]);
    });
    it("uses tomorrow + 7 days when no date can be found", async () => {
      const db = fakeDb([[legacy({ publishedContent: {}, content: "not json" })]]);
      await runLifecycle({ db, s3 } as any, cfg, NOW);
      expect(updates(db)).toEqual([backfillOf("2027-03-02")]);
    });
    it("leaves rows that have a date, and drafts, alone", async () => {
      const db = fakeDb([[notYet, legacy({ status: "draft" })]]);
      await runLifecycle({ db, s3 } as any, cfg, NOW);
      expect(updates(db)).toEqual([]);
    });
    it("doesn't count a row whose date was set meanwhile", async () => {
      const db = fakeDb([[legacy()]], { failUpdate: () => true });
      await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 0, skipped: 0, failed: 0 });
      expect(err).not.toHaveBeenCalled();
    });
    it("counts an unexpected backfill failure and carries on", async () => {
      const db = fakeDb([[legacy(), old]]);
      const send = db.send.getMockImplementation()!;
      db.send.mockImplementation(async (cmd: any) => {
        if (cmd.constructor.name === "UpdateCommand" && cmd.input.Key.id === "inv-legacy-01") throw new Error("Throttled");
        return send(cmd);
      });
      await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, backfilled: 0, erased: 1, skipped: 0, failed: 1 });
      expect(err).toHaveBeenCalledWith("lifecycle: backfill failed", "inv-legacy-01", expect.any(Error));
    });
    it("shows backfilled rows in the summary line", async () => {
      await runLifecycle({ db: fakeDb([[legacy()]]), s3 } as any, cfg, NOW);
      expect(log).toHaveBeenCalledWith("lifecycle: offline=0 backfilled=1 erased=0 skipped=0 failed=0");
    });
  });

  it("logs a one-line summary", async () => {
    vi.mocked(eraseInvitation).mockRejectedValueOnce(new Error("x"));
    await runLifecycle({ db: fakeDb([[due, old, gone]]), s3 } as any, cfg, NOW);
    expect(log).toHaveBeenCalledWith("lifecycle: offline=1 backfilled=0 erased=1 skipped=0 failed=1");
  });
});
