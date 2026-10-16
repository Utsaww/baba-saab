import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./run", () => ({ runLifecycle: vi.fn(async () => ({ offline: 0, erased: 0, failed: 0 })) }));
vi.mock("./erase", () => ({ eraseInvitation: vi.fn(async () => true) }));
vi.mock("./transitions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./transitions")>();
  return {
    ...actual,
    load: vi.fn(),
    claimForErase: vi.fn(async () => undefined),
    takeOffline: vi.fn(async () => ({ status: "offline" })),
    putOnline: vi.fn(async () => ({ status: "published" })),
    setOfflineOn: vi.fn(async () => ({ offlineOn: "2027-03-01" })),
    remove: vi.fn(async () => ({ status: "deleted" })),
    restore: vi.fn(async () => ({ status: "draft", purgeAt: null })),
  };
});

import { eraseInvitation } from "./erase";
import { handler } from "./handler";
import { runLifecycle } from "./run";
import { claimForErase, load, LifecycleError, putOnline, remove, restore, setOfflineOn, takeOffline } from "./transitions";

const ID = "0f8e2c6a-1b2c-4d5e-8f90-123456789abc";
function event(fieldName: string, args: Record<string, unknown> = {}, groups: string[] | null = ["admin"]) {
  return { typeName: "Mutation", fieldName, arguments: args, identity: { username: "u", groups } };
}

describe("invitation-lifecycle handler", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("runs the daily job for a scheduled event (no fieldName, no identity)", async () => {
    const scheduled = { "detail-type": "Scheduled Event", source: "aws.scheduler", detail: {} };
    await expect(handler(scheduled as any)).resolves.toEqual({ offline: 0, erased: 0, failed: 0 });
    expect(runLifecycle).toHaveBeenCalledWith(
      { db: expect.anything(), s3: expect.anything() },
      expect.objectContaining({ tables: expect.any(Object), bucket: expect.any(String) }),
      expect.any(Date),
    );
  });

  it.each([[["owner"]], [[]], [null]])("refuses a non-staff caller %j", async (groups) => {
    await expect(handler(event("takeInvitationOffline", { id: ID, expectedVersion: 1 }, groups) as any)).rejects.toMatchObject({
      name: "Forbidden",
    });
    await expect(handler({ fieldName: "softDeleteInvitation", arguments: { id: ID }, identity: null } as any)).rejects.toMatchObject({
      name: "Forbidden",
    });
    expect(takeOffline).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(runLifecycle).not.toHaveBeenCalled();
  });

  it("dispatches each staff mutation", async () => {
    await handler(event("takeInvitationOffline", { id: ID, expectedVersion: 3 }) as any);
    expect(takeOffline).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: ID, expectedVersion: 3 }, expect.any(String));
    await handler(event("putInvitationOnline", { id: ID, expectedVersion: 3, offlineOn: "2027-03-01" }) as any);
    expect(putOnline).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: ID, expectedVersion: 3, offlineOn: "2027-03-01" }, expect.any(String));
    await handler(event("setInvitationOfflineOn", { id: ID, expectedVersion: 3, offlineOn: "2027-03-01" }) as any);
    expect(setOfflineOn).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: ID, expectedVersion: 3, offlineOn: "2027-03-01" }, expect.any(String));
    await handler(event("softDeleteInvitation", { id: ID, expectedVersion: 3 }) as any);
    expect(remove).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: ID, expectedVersion: 3 }, expect.any(String));
    await expect(handler(event("restoreInvitation", { id: ID, expectedVersion: 3 }) as any)).resolves.toEqual({ status: "draft", purgeAt: null });
    expect(restore).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), { id: ID, expectedVersion: 3, offlineOn: undefined }, expect.any(String));
    await handler(event("restoreInvitation", { id: ID, expectedVersion: 3, offlineOn: "2027-03-01" }) as any);
    expect(restore).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), { id: ID, expectedVersion: 3, offlineOn: "2027-03-01" }, expect.any(String));
    expect(runLifecycle).not.toHaveBeenCalled();
  });

  describe("eraseInvitationNow", () => {
    it.each(["draft", "published"])("refuses a %s invitation", async (status) => {
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status, version: 1, slug: "a-b" });
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "a-b" }) as any)).rejects.toMatchObject({
        name: "WrongStatus",
        message: "Take it offline or delete it first",
      });
      expect(eraseInvitation).not.toHaveBeenCalled();
      expect(claimForErase).not.toHaveBeenCalled();
    });
    it("refuses a wrong confirmation", async () => {
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status: "offline", version: 1, slug: "a-b" });
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "a-c" }) as any)).rejects.toMatchObject({ name: "BadConfirm" });
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status: "deleted", version: 1, slug: null });
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "a-b" }) as any)).rejects.toMatchObject({ name: "BadConfirm" });
      expect(eraseInvitation).not.toHaveBeenCalled();
      expect(claimForErase).not.toHaveBeenCalled();
    });
    it("erases when confirmed with the link name, or 'delete' when there is none", async () => {
      const inv = { id: ID, status: "offline", version: 1, slug: "a-b" };
      vi.mocked(load).mockResolvedValueOnce(inv);
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "a-b" }) as any)).resolves.toEqual({ erased: true });
      expect(claimForErase).toHaveBeenCalledWith(expect.anything(), expect.anything(), inv);
      expect(eraseInvitation).toHaveBeenLastCalledWith(
        { db: expect.anything(), s3: expect.anything() },
        expect.objectContaining({ tables: expect.any(Object), bucket: expect.any(String) }),
        { id: ID, slug: "a-b" },
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      );
      // The row is claimed (purgeAt = the epoch) before any file is touched.
      expect(vi.mocked(claimForErase).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(eraseInvitation).mock.invocationCallOrder[0]);
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status: "deleted", version: 1, slug: null });
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "delete" }) as any)).resolves.toEqual({ erased: true });
      expect(load).toHaveBeenCalledWith(expect.anything(), expect.anything(), ID);
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status: "deleted", version: 1, slug: "" });
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "delete" }) as any)).resolves.toEqual({ erased: true });
    });
    it("says the invitation changed when its record wasn't deleted after all", async () => {
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status: "offline", version: 1, slug: "a-b" });
      vi.mocked(eraseInvitation).mockResolvedValueOnce(false);
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "a-b" }) as any)).rejects.toMatchObject({
        name: "WrongStatus",
        message: "This invitation changed — reload the page.",
      });
    });
    it("does not erase when the claim finds the row changed", async () => {
      vi.mocked(load).mockResolvedValueOnce({ id: ID, status: "offline", version: 1, slug: "a-b" });
      vi.mocked(claimForErase).mockRejectedValueOnce(new LifecycleError("VersionConflict", "Updated by someone else — reload"));
      await expect(handler(event("eraseInvitationNow", { id: ID, confirm: "a-b" }) as any)).rejects.toMatchObject({ name: "VersionConflict" });
      expect(eraseInvitation).not.toHaveBeenCalled();
    });
  });

  it("passes staff-facing errors through", async () => {
    vi.mocked(takeOffline).mockRejectedValueOnce(new LifecycleError("VersionConflict", "Updated by someone else — reload"));
    await expect(handler(event("takeInvitationOffline", { id: ID, expectedVersion: 1 }) as any)).rejects.toMatchObject({
      name: "VersionConflict",
    });
  });

  it("hides unexpected errors behind a friendly message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(remove).mockRejectedValueOnce(new Error("AccessDeniedException: arn:aws:iam::123:role/x"));
    await expect(handler(event("softDeleteInvitation", { id: ID, expectedVersion: 1 }) as any)).rejects.toThrow(
      /^Something went wrong. Please try again.$/,
    );
    expect(log).toHaveBeenCalled();
  });

  it("rejects unknown operations", async () => {
    await expect(handler(event("dropTables") as any)).rejects.toMatchObject({ name: "Unknown" });
  });
});
