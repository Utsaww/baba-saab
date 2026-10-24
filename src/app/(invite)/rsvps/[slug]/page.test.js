import { beforeEach, describe, expect, it, vi } from "vitest";

const getFamilyRsvps = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }));
vi.mock("@/InvitationModule/server/familyRsvps", () => ({ getFamilyRsvps }));
vi.mock("next/navigation", () => ({ notFound }));

import FamilyRsvps from "@/InvitationModule/public/FamilyRsvps";
import FamilyRsvpsPage, { dynamic, generateMetadata } from "./page";

const data = { couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } }, language: "en", events: [], rows: [] };
beforeEach(() => vi.clearAllMocks());

describe("family RSVP page", () => {
  it("is rendered per request", () => expect(dynamic).toBe("force-dynamic"));

  it("renders the list for a valid token", async () => {
    getFamilyRsvps.mockResolvedValue(data);
    const tree = await FamilyRsvpsPage({ params: { slug: "p-r" }, searchParams: { k: "tok" } });
    expect(getFamilyRsvps).toHaveBeenCalledWith("p-r", "tok");
    expect(tree.type).toBe(FamilyRsvps);
    expect(tree.props.slug).toBe("p-r");
  });

  it("is not found for a wrong link or a missing token", async () => {
    getFamilyRsvps.mockResolvedValue(null);
    await expect(FamilyRsvpsPage({ params: { slug: "p-r" }, searchParams: { k: "old" } })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(FamilyRsvpsPage({ params: { slug: "p-r" }, searchParams: {} })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getFamilyRsvps).toHaveBeenCalledTimes(1);
  });

  it("is noindex, titled with the couple", async () => {
    getFamilyRsvps.mockResolvedValue(data);
    const meta = await generateMetadata({ params: { slug: "p-r" }, searchParams: { k: "tok" } });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toBe("RSVPs — Priya & Rahul");
  });

  it("is noindex with a plain title when the link is unavailable or the backend fails", async () => {
    getFamilyRsvps.mockRejectedValue(new Error("boom"));
    const meta = await generateMetadata({ params: { slug: "p-r" }, searchParams: { k: "tok" } });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toBe("RSVPs");
  });
});
