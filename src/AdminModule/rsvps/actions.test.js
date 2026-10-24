import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireStaff: vi.fn() }));
vi.mock("@/AdminModule/auth/server", () => auth);
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);
const data = vi.hoisted(() => ({
  listRsvps: vi.fn(), saveRsvp: vi.fn(), removeRsvp: vi.fn(), regenerateFamilyTokenRecord: vi.fn(), markSeenRecord: vi.fn(),
}));
vi.mock("./data", () => ({
  ...data,
  RsvpConflict: class RsvpConflict extends Error {},
}));

import { listRsvpsAction, markRsvpsSeenAction, newFamilyLinkAction, removeRsvpAction, saveRsvpAction } from "./actions";

const GENERIC = "Couldn't save that change. Check your connection and try again.";
const cases = [
  ["listRsvpsAction", listRsvpsAction, ["inv"]],
  ["saveRsvpAction", saveRsvpAction, ["inv", { name: "A" }]],
  ["removeRsvpAction", removeRsvpAction, ["inv", "k"]],
  ["newFamilyLinkAction", newFamilyLinkAction, ["inv"]],
  ["markRsvpsSeenAction", markRsvpsSeenAction, ["inv"]],
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.requireStaff.mockResolvedValue({ email: "s@x.com" });
  data.listRsvps.mockResolvedValue([{ name: "A" }]);
  data.saveRsvp.mockResolvedValue({ rsvpKey: "k" });
  data.removeRsvp.mockResolvedValue(undefined);
  data.regenerateFamilyTokenRecord.mockResolvedValue({ data: { familyToken: "tok" } });
  data.markSeenRecord.mockResolvedValue({ data: { ok: true } });
});

describe("requireStaff gate", () => {
  it("runs first in every action and blocks when it rejects", async () => {
    auth.requireStaff.mockRejectedValue(new Error("redirect"));
    for (const [, action, args] of cases) await expect(action(...args)).rejects.toThrow("redirect");
    for (const fn of Object.values(data)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("success shapes", () => {
  it("list returns rows", async () => expect(await listRsvpsAction("inv")).toEqual({ ok: true, rows: [{ name: "A" }] }));
  it("save returns the saved key and refreshes", async () => {
    expect(await saveRsvpAction("inv", { name: "A" })).toEqual({ ok: true, rsvpKey: "k" });
    expect(data.saveRsvp).toHaveBeenCalledWith("inv", { name: "A" }, { previousKey: undefined });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/invitations/inv/edit");
  });
  it("passes previousKey to saveRsvp and shows a key conflict to staff", async () => {
    await saveRsvpAction("inv", { name: "A" }, { previousKey: "old" });
    expect(data.saveRsvp).toHaveBeenCalledWith("inv", { name: "A" }, { previousKey: "old" });
    const { RsvpConflict } = await import("./data");
    data.saveRsvp.mockRejectedValue(new RsvpConflict("Another reply already uses this name and phone — edit that one instead."));
    cache.revalidatePath.mockClear();
    expect(await saveRsvpAction("inv", { name: "A" })).toEqual({ ok: false, message: "Another reply already uses this name and phone — edit that one instead." });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
  it("a revalidate failure after a successful save does not report failure", async () => {
    cache.revalidatePath.mockImplementationOnce(() => { throw new Error("cache"); });
    expect(await saveRsvpAction("inv", { name: "A" })).toEqual({ ok: true, rsvpKey: "k" });
  });
  it("remove refreshes", async () => {
    expect(await removeRsvpAction("inv", "k")).toEqual({ ok: true });
    expect(data.removeRsvp).toHaveBeenCalledWith("inv", "k");
  });
  it("new family link returns the token", async () => expect(await newFamilyLinkAction("inv")).toEqual({ ok: true, familyToken: "tok" }));
  it("mark seen returns ok", async () => expect(await markRsvpsSeenAction("inv")).toEqual({ ok: true }));
});

describe("failures", () => {
  it.each(cases)("%s maps a throw to the generic message", async (_n, action, args) => {
    for (const fn of Object.values(data)) fn.mockRejectedValue(new Error("boom"));
    expect(await action(...args)).toEqual({ ok: false, message: GENERIC });
  });
  it("maps mutation errors or missing data to the generic message", async () => {
    data.regenerateFamilyTokenRecord.mockResolvedValue({ data: null, errors: [{ message: "x" }] });
    data.markSeenRecord.mockResolvedValue({ data: null });
    expect(await newFamilyLinkAction("inv")).toEqual({ ok: false, message: GENERIC });
    expect(await markRsvpsSeenAction("inv")).toEqual({ ok: false, message: GENERIC });
  });
});
