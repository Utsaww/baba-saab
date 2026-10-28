import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("next/navigation", () => nav);
const auth = vi.hoisted(() => ({ requireStaff: vi.fn(async () => ({})) }));
vi.mock("@/AdminModule/auth/server", () => auth);
const inv = vi.hoisted(() => ({ getInvitation: vi.fn() }));
vi.mock("@/AdminModule/invitations/data", () => inv);
const rsvpData = vi.hoisted(() => ({ listRsvps: vi.fn(), regenerateFamilyTokenRecord: vi.fn() }));
vi.mock("@/AdminModule/rsvps/data", () => rsvpData);
vi.mock("@/AdminModule/rsvps/actions", () => ({
  saveRsvpAction: vi.fn(), removeRsvpAction: vi.fn(), newFamilyLinkAction: vi.fn(), markRsvpsSeenAction: vi.fn(),
}));
vi.mock("@/AdminModule/rsvps/RsvpPage", () => ({ default: () => null }));

import * as actions from "@/AdminModule/rsvps/actions";
import RsvpsPage from "./page";

const invitation = {
  id: "inv-1", slug: "priya-rahul", familyToken: "fam", rsvpNewCount: 2,
  content: { language: "hi", couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } }, events: [{ id: "e1", name: { en: "Haldi" } }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  inv.getInvitation.mockResolvedValue(structuredClone(invitation));
  rsvpData.listRsvps.mockResolvedValue([
    { invitationId: "inv-1", rsvpKey: "k", phoneKey: "91", name: "A", phone: "9", attending: "yes", guestCount: 2, eventIds: ["e1"], meal: null, message: null, source: "guest", createdAt: "c", updatedAt: "u", owner: "x", extra: () => {} },
  ]);
});

describe("RSVP page route", () => {
  it("checks staff first and passes the invitation, plain rows and the four actions the page uses", async () => {
    const el = await RsvpsPage({ params: { id: "inv-1" } });
    const staffAt = auth.requireStaff.mock.invocationCallOrder[0];
    expect(staffAt).toBeLessThan(inv.getInvitation.mock.invocationCallOrder[0]);
    expect(staffAt).toBeLessThan(rsvpData.listRsvps.mock.invocationCallOrder[0]);
    expect(inv.getInvitation).toHaveBeenCalledWith("inv-1");
    expect(el.props.invitation).toMatchObject({ id: "inv-1", slug: "priya-rahul", familyToken: "fam", language: "hi", events: invitation.content.events });
    expect(typeof el.props.invitation.title).toBe("string");
    expect(el.props.initialRows).toEqual([
      { rsvpKey: "k", phoneKey: "91", name: "A", phone: "9", attending: "yes", guestCount: 2, eventIds: ["e1"], meal: null, message: null, source: "guest", createdAt: "c", updatedAt: "u" },
    ]);
    expect(Object.keys(el.props.actions).sort()).toEqual(Object.keys(actions).sort());
    for (const [name, fn] of Object.entries(actions)) expect(el.props.actions[name]).toBe(fn);
    expect(rsvpData.regenerateFamilyTokenRecord).not.toHaveBeenCalled();
  });

  it("creates the family token the first time, like the preview token", async () => {
    inv.getInvitation.mockResolvedValue({ ...structuredClone(invitation), familyToken: null });
    rsvpData.regenerateFamilyTokenRecord.mockResolvedValue({ data: { familyToken: "new" } });
    const el = await RsvpsPage({ params: { id: "inv-1" } });
    expect(rsvpData.regenerateFamilyTokenRecord).toHaveBeenCalledWith("inv-1");
    expect(el.props.invitation.familyToken).toBe("new");
  });

  it("logs a token mutation that answers with errors", async () => {
    inv.getInvitation.mockResolvedValue({ ...structuredClone(invitation), familyToken: null });
    rsvpData.regenerateFamilyTokenRecord.mockResolvedValue({ data: null, errors: [{ message: "denied" }] });
    const el = await RsvpsPage({ params: { id: "inv-1" } });
    expect(el.props.invitation.familyToken).toBeNull();
    expect(console.error).toHaveBeenCalledWith("regenerateFamilyToken failed", [{ message: "denied" }]);
  });

  it("still renders when the token or the replies can't be loaded", async () => {
    inv.getInvitation.mockResolvedValue({ ...structuredClone(invitation), familyToken: null });
    rsvpData.regenerateFamilyTokenRecord.mockRejectedValue(new Error("x"));
    rsvpData.listRsvps.mockRejectedValue(new Error("y"));
    const el = await RsvpsPage({ params: { id: "inv-1" } });
    expect(el.props.invitation.familyToken).toBeNull();
    expect(el.props.initialRows).toBeNull();
  });

  it("is not found for an unknown invitation", async () => {
    inv.getInvitation.mockResolvedValue(null);
    await expect(RsvpsPage({ params: { id: "nope" } })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
