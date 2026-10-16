import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireStaff: vi.fn() }));
vi.mock("@/AdminModule/auth/server", () => auth);
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);
const data = vi.hoisted(() => ({
  takeOfflineRecord: vi.fn(), putOnlineRecord: vi.fn(), setOfflineOnRecord: vi.fn(),
  deleteRecord: vi.fn(), restoreRecord: vi.fn(), eraseNowRecord: vi.fn(),
}));
vi.mock("./data", () => data);

import {
  deleteInvitationAction, eraseNowAction, putOnlineAction, restoreInvitationAction, setOfflineOnAction, takeOfflineAction,
} from "./lifecycleActions";

const GENERIC = "Couldn't save that change. Check your connection and try again.";
const row = { status: "offline", offlineAt: "t", purgeAt: "p", offlineOn: "2027-03-01", deletedAt: null, version: 5 };

const cases = [
  ["takeOfflineAction", takeOfflineAction, { id: "inv-1", expectedVersion: 4 }, "takeOfflineRecord"],
  ["putOnlineAction", putOnlineAction, { id: "inv-1", expectedVersion: 4, offlineOn: "2027-03-01" }, "putOnlineRecord"],
  ["setOfflineOnAction", setOfflineOnAction, { id: "inv-1", expectedVersion: 4, offlineOn: "2027-03-01" }, "setOfflineOnRecord"],
  ["deleteInvitationAction", deleteInvitationAction, { id: "inv-1", expectedVersion: 4 }, "deleteRecord"],
  ["restoreInvitationAction", restoreInvitationAction, { id: "inv-1", expectedVersion: 4 }, "restoreRecord"],
  ["eraseNowAction", eraseNowAction, { id: "inv-1", confirm: "priya-rahul" }, "eraseNowRecord"],
];

beforeEach(() => {
  vi.clearAllMocks();
  auth.requireStaff.mockResolvedValue({ email: "s@x.com" });
});

describe("requireStaff gate", () => {
  it("is called first by every action and blocks when it rejects", async () => {
    auth.requireStaff.mockRejectedValue(new Error("redirect"));
    for (const [, action, args] of cases) await expect(action(args)).rejects.toThrow("redirect");
    for (const fn of Object.values(data)) expect(fn).not.toHaveBeenCalled();
  });
});

describe.each(cases)("%s", (_name, action, args, record) => {
  it("passes its arguments to data and refreshes on success", async () => {
    data[record].mockResolvedValue({ data: row });
    const r = await action(args);
    expect(data[record]).toHaveBeenCalledWith(args);
    expect(r.ok).toBe(true);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/invitations/inv-1/edit");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/invitations");
  });
  it("maps a version conflict", async () => {
    data[record].mockResolvedValue({ errors: [{ errorType: "VersionConflict" }] });
    expect(await action(args)).toEqual({ ok: false, conflict: true });
  });
  it("maps BadDate", async () => {
    data[record].mockResolvedValue({ errors: [{ errorType: "BadDate" }] });
    expect(await action(args)).toEqual({ ok: false, message: "Pick a date after today" });
  });
  it("maps WrongStatus whatever the backend message says", async () => {
    data[record].mockResolvedValue({ errors: [{ errorType: "WrongStatus", message: "This invitation is being erased" }] });
    expect(await action(args)).toEqual({ ok: false, message: "This invitation changed — reload the page." });
  });
  it("never leaks a thrown error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    data[record].mockRejectedValue(new Error("secret internals"));
    expect(await action(args)).toEqual({ ok: false, message: GENERIC });
  });
  it("is a failure, not a success, when data comes back empty", async () => {
    data[record].mockResolvedValue({ data: null });
    expect((await action(args)).ok).toBe(false);
  });
});

describe("result shapes", () => {
  it("take offline returns status and dates", async () => {
    data.takeOfflineRecord.mockResolvedValue({ data: row });
    expect(await takeOfflineAction({ id: "inv-1", expectedVersion: 4 })).toEqual({ ok: true, status: "offline", offlineAt: "t", purgeAt: "p" });
  });
  it("erase now returns just ok", async () => {
    data.eraseNowRecord.mockResolvedValue({ data: { ok: true } });
    expect(await eraseNowAction({ id: "inv-1", confirm: "x" })).toEqual({ ok: true });
  });
  it("erase maps a wrong confirmation", async () => {
    data.eraseNowRecord.mockResolvedValue({ errors: [{ errorType: "BadConfirm" }] });
    expect(await eraseNowAction({ id: "inv-1", confirm: "x" })).toEqual({ ok: false, message: "That doesn't match — type it exactly as shown." });
  });
});

describe("date validation", () => {
  it.each(["14-02-2027", "2027-02-31", "", undefined])("putOnline and setOfflineOn reject %s before calling data", async (offlineOn) => {
    for (const action of [putOnlineAction, setOfflineOnAction]) {
      expect(await action({ id: "inv-1", expectedVersion: 4, offlineOn })).toEqual({ ok: false, message: "Pick a date after today" });
    }
    expect(data.putOnlineRecord).not.toHaveBeenCalled();
    expect(data.setOfflineOnRecord).not.toHaveBeenCalled();
  });
  it("restore passes an optional valid offlineOn through", async () => {
    data.restoreRecord.mockResolvedValue({ data: row });
    await restoreInvitationAction({ id: "inv-1", expectedVersion: 4, offlineOn: "2027-03-01" });
    expect(data.restoreRecord).toHaveBeenCalledWith({ id: "inv-1", expectedVersion: 4, offlineOn: "2027-03-01" });
  });
  it("restore with offlineOn omitted passes no offlineOn", async () => {
    data.restoreRecord.mockResolvedValue({ data: row });
    await restoreInvitationAction({ id: "inv-1", expectedVersion: 4 });
    expect(data.restoreRecord.mock.calls[0][0].offlineOn).toBeUndefined();
  });
  it("restore rejects a malformed offlineOn before calling data", async () => {
    expect(await restoreInvitationAction({ id: "inv-1", expectedVersion: 4, offlineOn: "14-02-2027" })).toEqual({ ok: false, message: "Pick a date after today" });
    expect(data.restoreRecord).not.toHaveBeenCalled();
  });
});
