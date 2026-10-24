import { beforeEach, describe, expect, it, vi } from "vitest";

const rsvp = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), get: vi.fn(), delete: vi.fn() }));
const mutations = vi.hoisted(() => ({ regenerateFamilyToken: vi.fn(), markRsvpsSeen: vi.fn() }));
vi.mock("@/AdminModule/dataClient", () => ({ cookieDataClient: () => ({ models: { Rsvp: rsvp }, mutations }) }));

import { listRsvps, markSeenRecord, regenerateFamilyTokenRecord, removeRsvp, saveRsvp } from "./data";

beforeEach(() => {
  vi.clearAllMocks();
  rsvp.get.mockResolvedValue({ data: null });
  rsvp.create.mockResolvedValue({ data: {} });
  rsvp.update.mockResolvedValue({ data: {} });
  rsvp.delete.mockResolvedValue({ data: {} });
});

describe("listRsvps", () => {
  it("follows nextToken across pages", async () => {
    rsvp.list.mockResolvedValueOnce({ data: [{ name: "a" }], nextToken: "t" }).mockResolvedValueOnce({ data: [{ name: "b" }] });
    expect((await listRsvps("inv")).map((r) => r.name)).toEqual(["a", "b"]);
    expect(rsvp.list.mock.calls[0][0].invitationId).toEqual({ eq: "inv" });
    expect(rsvp.list.mock.calls[1][0].nextToken).toBe("t");
  });
  it("throws on errors", async () => {
    rsvp.list.mockResolvedValue({ data: [], errors: [{ message: "denied" }] });
    await expect(listRsvps("inv")).rejects.toThrow("denied");
  });
});

describe("saveRsvp", () => {
  const base = { name: "Asha Rao", attending: "yes", guestCount: 2, eventIds: ["e1"] };
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
  it("updates in place when the row already has an rsvpKey", async () => {
    await saveRsvp("inv", { ...base, rsvpKey: "staff#abc" });
    expect(rsvp.create).not.toHaveBeenCalled();
    expect(rsvp.update.mock.calls[0][0]).toMatchObject({ invitationId: "inv", rsvpKey: "staff#abc", name: "Asha Rao" });
  });
  it("updates when the phone-derived key already exists", async () => {
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
