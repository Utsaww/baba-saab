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
      ProjectionExpression: "id, #status, version, slug, offlineOn, purgeAt",
      ExpressionAttributeNames: { "#status": "status" },
      ConsistentRead: true,
      ExclusiveStartKey: undefined,
    });
  });

  it("takes a due published row offline, conditioned on what it read", async () => {
    const db = fakeDb([[due]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 1, erased: 0, skipped: 0, failed: 0 });
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
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 0, skipped: 0, failed: 0 });
    expect(updates(db)).toEqual([]);
    expect(eraseInvitation).not.toHaveBeenCalled();
  });

  it("skips a row changed between scan and write without counting a failure", async () => {
    const db = fakeDb([[due]], { failUpdate: () => true });
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 0, skipped: 0, failed: 0 });
    expect(err).not.toHaveBeenCalled();
  });

  it("erases offline and deleted rows past purgeAt", async () => {
    const db = fakeDb([[old, gone]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 2, skipped: 0, failed: 0 });
    expect(eraseInvitation).toHaveBeenCalledWith({ db, s3 }, cfg, { id: "inv-old-0001", slug: "old" }, "2027-02-21T21:30:00.000Z");
    expect(eraseInvitation).toHaveBeenCalledWith({ db, s3 }, cfg, { id: "inv-gone-001", slug: null }, "2027-02-21T21:30:00.000Z");
  });

  it("re-reads a row before erasing and skips it if it was restored or its clock restarted", async () => {
    const restored = fakeDb([[old]], { fresh: () => ({ ...old, status: "published", purgeAt: undefined }) });
    await expect(runLifecycle({ db: restored, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 0, skipped: 0, failed: 0 });
    const restarted = fakeDb([[old]], { fresh: () => ({ ...old, purgeAt: "2027-03-23T00:00:00.000Z" }) });
    await expect(runLifecycle({ db: restarted, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 0, skipped: 0, failed: 0 });
    const vanished = fakeDb([[old]], { fresh: () => undefined });
    await expect(runLifecycle({ db: vanished, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 0, skipped: 0, failed: 0 });
    expect(eraseInvitation).not.toHaveBeenCalled();
    const get = restored.calls.find((c) => c.constructor.name === "GetCommand").input;
    expect(get).toEqual({ TableName: "Inv", Key: { id: "inv-old-0001" }, ConsistentRead: true });
  });

  it("counts a row as skipped, not erased, when its record delete fails its condition", async () => {
    vi.mocked(eraseInvitation).mockResolvedValueOnce(false);
    const db = fakeDb([[old, gone]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 1, skipped: 1, failed: 0 });
    expect(err).not.toHaveBeenCalled();
  });

  it("counts an erase failure, logs it and carries on with the next row", async () => {
    const boom = new Error("AccessDenied");
    vi.mocked(eraseInvitation).mockRejectedValueOnce(boom);
    const db = fakeDb([[old, gone, due]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 1, erased: 1, skipped: 0, failed: 1 });
    expect(err).toHaveBeenCalledWith("lifecycle: erase failed", "inv-old-0001", boom);
  });

  it("counts an unexpected offline-write failure and carries on", async () => {
    const db = fakeDb([[due, old]]);
    const send = db.send.getMockImplementation()!;
    db.send.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name === "UpdateCommand") throw new Error("Throttled");
      return send(cmd);
    });
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 0, erased: 1, skipped: 0, failed: 1 });
    expect(err).toHaveBeenCalledWith("lifecycle: offline failed", "inv-due-0001", expect.any(Error));
  });

  it("pages through the whole table", async () => {
    const db = fakeDb([[due], [old], [gone]]);
    await expect(runLifecycle({ db, s3 } as any, cfg, NOW)).resolves.toEqual({ offline: 1, erased: 2, skipped: 0, failed: 0 });
    const scans = db.calls.filter((c) => c.constructor.name === "ScanCommand").map((c) => c.input.ExclusiveStartKey);
    expect(scans).toEqual([undefined, { page: "1" }, { page: "2" }]);
  });

  it("logs a one-line summary", async () => {
    vi.mocked(eraseInvitation).mockRejectedValueOnce(new Error("x"));
    await runLifecycle({ db: fakeDb([[due, old, gone]]), s3 } as any, cfg, NOW);
    expect(log).toHaveBeenCalledWith("lifecycle: offline=1 erased=1 skipped=0 failed=1");
  });
});
