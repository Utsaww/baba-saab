import { beforeEach, describe, expect, it, vi } from "vitest";

const rsvp = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), get: vi.fn(), delete: vi.fn() }));
const mutations = vi.hoisted(() => ({ regenerateFamilyToken: vi.fn(), markRsvpsSeen: vi.fn() }));
const invitation = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/AdminModule/dataClient", () => ({ cookieDataClient: () => ({ models: { Rsvp: rsvp, Invitation: invitation }, mutations }) }));

import { INVITATION_GONE, RsvpConflict, listRsvps, markSeenRecord, regenerateFamilyTokenRecord, removeRsvp, saveRsvp } from "./data";

beforeEach(() => {
  vi.clearAllMocks();
  rsvp.get.mockResolvedValue({ data: null });
  rsvp.create.mockResolvedValue({ data: {} });
  rsvp.update.mockResolvedValue({ data: {} });
  rsvp.delete.mockResolvedValue({ data: {} });
  invitation.get.mockResolvedValue({ data: { id: "inv" } });
});

describe("listRsvps", () => {
  it("follows nextToken across pages", async () => {
    rsvp.list.mockResolvedValueOnce({ data: [{ name: "a" }], nextToken: "t" }).mockResolvedValueOnce({ data: [{ name: "b" }] });
    expect((await listRsvps("inv")).map((r) => r.name)).toEqual(["a", "b"]);
    expect(rsvp.list.mock.calls[0][0]).toEqual({ invitationId: "inv", limit: 100, nextToken: null });
    expect(rsvp.list.mock.calls[1][0].nextToken).toBe("t");
  });
  it("throws on errors", async () => {
    rsvp.list.mockResolvedValue({ data: [], errors: [{ message: "denied" }] });
    await expect(listRsvps("inv")).rejects.toThrow("denied");
  });
});

describe("saveRsvp", () => {
  const base = { name: "Asha Rao", attending: "yes", guestCount: 2, eventIds: ["e1"] };
  it("refuses when the invitation no longer exists, writing nothing", async () => {
    invitation.get.mockResolvedValue({ data: null });
    const err = await saveRsvp("inv", { ...base, phone: "+91 98765 43210" }).catch((e) => e);
    expect(err).toBeInstanceOf(RsvpConflict);
    expect(err.message).toBe("This invitation no longer exists.");
    expect(INVITATION_GONE).toBe("This invitation no longer exists.");
    expect(invitation.get).toHaveBeenCalledWith({ id: "inv" }, { selectionSet: ["id"] });
    for (const fn of [rsvp.create, rsvp.update, rsvp.delete]) expect(fn).not.toHaveBeenCalled();
  });
  it("passes on errors from the invitation check", async () => {
    invitation.get.mockResolvedValue({ data: null, errors: [{ message: "denied" }] });
    await expect(saveRsvp("inv", base)).rejects.toThrow("denied");
    expect(rsvp.create).not.toHaveBeenCalled();
  });
  it("keys a row with a phone by rsvpKeyFor and creates it as staff", async () => {
    await saveRsvp("inv", { ...base, phone: "+91 98765 43210" });
    const arg = rsvp.create.mock.calls[0][0];
    expect(arg).toMatchObject({ invitationId: "inv", rsvpKey: "919876543210#asha rao", phoneKey: "919876543210", source: "staff", name: "Asha Rao" });
  });
  it("keys a phone-less row staff#<uuid>, with no phoneKey", async () => {
    await saveRsvp("inv", base);
    const arg = rsvp.create.mock.calls[0][0];
    expect(arg.rsvpKey).toMatch(/^staff#[0-9a-f-]{36}$/);
    expect(arg.phoneKey).toBeNull();
    expect(arg.source).toBe("staff");
  });
  it("updates in place when previousKey equals the recomputed key", async () => {
    await saveRsvp("inv", { ...base, phone: "+91 98765 43210", meal: "veg" }, { previousKey: "919876543210#asha rao" });
    expect(rsvp.create).not.toHaveBeenCalled();
    expect(rsvp.delete).not.toHaveBeenCalled();
    expect(rsvp.update.mock.calls[0][0]).toMatchObject({ rsvpKey: "919876543210#asha rao", source: "staff", meal: "veg" });
  });
  it("keeps a phone-less staff key on edit", async () => {
    await saveRsvp("inv", { ...base, name: "Renamed" }, { previousKey: "staff#abc" });
    expect(rsvp.update.mock.calls[0][0]).toMatchObject({ rsvpKey: "staff#abc", phoneKey: null });
    expect(rsvp.delete).not.toHaveBeenCalled();
  });
  it("rename: creates under the new key, then deletes the old", async () => {
    const order = [];
    rsvp.create.mockImplementation(async () => (order.push("create"), { data: {} }));
    rsvp.delete.mockImplementation(async () => (order.push("delete"), { data: {} }));
    const r = await saveRsvp("inv", { ...base, name: "Asha  Verma", phone: "+91 98765 43210" }, { previousKey: "919876543210#asha rao" });
    expect(r.rsvpKey).toBe("919876543210#asha verma");
    expect(rsvp.create.mock.calls[0][0]).toMatchObject({ rsvpKey: "919876543210#asha verma", phoneKey: "919876543210" });
    expect(rsvp.delete).toHaveBeenCalledWith({ invitationId: "inv", rsvpKey: "919876543210#asha rao" });
    expect(order).toEqual(["create", "delete"]);
  });
  it("adding a phone to a staff# row re-keys it by phone", async () => {
    const r = await saveRsvp("inv", { ...base, phone: "+91 98765 43210" }, { previousKey: "staff#abc" });
    expect(r.rsvpKey).toBe("919876543210#asha rao");
    expect(rsvp.create.mock.calls[0][0]).toMatchObject({ phoneKey: "919876543210" });
    expect(rsvp.delete).toHaveBeenCalledWith({ invitationId: "inv", rsvpKey: "staff#abc" });
  });
  it("clearing the phone moves the row to a staff# key with no phoneKey", async () => {
    const r = await saveRsvp("inv", { ...base, phone: "" }, { previousKey: "919876543210#asha rao" });
    expect(r.rsvpKey).toMatch(/^staff#/);
    expect(rsvp.create.mock.calls[0][0]).toMatchObject({ phone: null, phoneKey: null });
    expect(rsvp.delete).toHaveBeenCalledWith({ invitationId: "inv", rsvpKey: "919876543210#asha rao" });
  });
  it("refuses an edit that lands on another guest's row, changing nothing", async () => {
    rsvp.get.mockResolvedValue({ data: { rsvpKey: "919876543210#asha verma" } });
    await expect(saveRsvp("inv", { ...base, name: "Asha Verma", phone: "+91 98765 43210" }, { previousKey: "919876543210#asha rao" }))
      .rejects.toMatchObject({ name: "RsvpConflict", message: "Another reply already uses this name and phone — edit that one instead." });
    expect(rsvp.create).not.toHaveBeenCalled();
    expect(rsvp.update).not.toHaveBeenCalled();
    expect(rsvp.delete).not.toHaveBeenCalled();
  });
  it("a new row whose phone-derived key already exists overwrites it (duplicate rule)", async () => {
    rsvp.get.mockResolvedValue({ data: { rsvpKey: "x" } });
    await saveRsvp("inv", { ...base, phone: "+91 98765 43210" });
    expect(rsvp.update).toHaveBeenCalled();
    expect(rsvp.create).not.toHaveBeenCalled();
  });
  it("throws on backend errors", async () => {
    rsvp.create.mockResolvedValue({ errors: [{ message: "nope" }] });
    await expect(saveRsvp("inv", base)).rejects.toThrow("nope");
  });
});

describe("removeRsvp and mutations", () => {
  it("deletes by identifier", async () => {
    await removeRsvp("inv", "k");
    expect(rsvp.delete).toHaveBeenCalledWith({ invitationId: "inv", rsvpKey: "k" });
  });
  it("parses AWSJSON results of the staff mutations", async () => {
    mutations.regenerateFamilyToken.mockResolvedValue({ data: JSON.stringify(JSON.stringify({ familyToken: "t" })) });
    mutations.markRsvpsSeen.mockResolvedValue({ data: { ok: true } });
    expect((await regenerateFamilyTokenRecord("inv")).data).toEqual({ familyToken: "t" });
    expect((await markSeenRecord("inv")).data).toEqual({ ok: true });
    expect(mutations.regenerateFamilyToken).toHaveBeenCalledWith({ id: "inv" });
  });
});
