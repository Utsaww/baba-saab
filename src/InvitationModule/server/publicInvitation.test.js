import { describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@aws-amplify/adapter-nextjs/data", () => ({ generateServerClientUsingReqRes: () => ({ queries: { publicInvitation: query } }) }));
vi.mock("@/AdminModule/auth/amplifyServer", () => ({ outputs: {}, runWithAmplifyServerContext: ({ operation }) => operation({}) }));
vi.mock("react", async (orig) => ({ ...(await orig()), cache: (fn) => fn }));

import { minimalSample } from "@/InvitationModule/templates/minimal/sample";
import { loadPublicInvitation } from "./publicInvitation";

const live = (content) => ({ data: { mode: "live", templateId: "minimal", content } });

describe("loadPublicInvitation", () => {
  it("returns null when nothing is visible", async () => {
    query.mockResolvedValue({ data: null });
    expect(await loadPublicInvitation("a-b")).toBeNull();
  });
  it("passes the preview token only when it's a non-empty string", async () => {
    query.mockResolvedValue({ data: null });
    await loadPublicInvitation("a-b", ["x", "y"]);
    expect(query).toHaveBeenLastCalledWith({}, { slug: "a-b" });
    await loadPublicInvitation("a-b", "tok");
    expect(query).toHaveBeenLastCalledWith({}, { slug: "a-b", previewToken: "tok" });
  });
  it("parses the live copy and switches RSVP off until Phase 4", async () => {
    const copy = { ...minimalSample, rsvp: { ...minimalSample.rsvp, enabled: true } };
    query.mockResolvedValue(live(JSON.stringify(copy)));
    const r = await loadPublicInvitation("a-b");
    expect(r.mode).toBe("live");
    expect(r.invitation.couple.bride.name).toEqual(copy.couple.bride.name);
    expect(r.invitation.rsvp.enabled).toBe(false);
  });
  it("accepts content that arrives as an object or double-encoded JSON", async () => {
    query.mockResolvedValue(live(JSON.stringify(JSON.stringify(minimalSample))));
    expect((await loadPublicInvitation("a-b")).invitation.couple.bride.name).toEqual(minimalSample.couple.bride.name);
    query.mockResolvedValue(live(minimalSample));
    expect((await loadPublicInvitation("a-b")).invitation.couple.bride.name).toEqual(minimalSample.couple.bride.name);
  });
  it("treats content that never becomes an object as a fault", async () => {
    query.mockResolvedValue(live("not json"));
    await expect(loadPublicInvitation("a-b")).rejects.toThrow();
    query.mockResolvedValue(live(JSON.stringify(JSON.stringify(JSON.stringify(minimalSample)))));
    await expect(loadPublicInvitation("a-b")).rejects.toThrow();
  });
  it("renders a preview from the draft", async () => {
    const draft = { templateId: "minimal", theme: { palette: minimalSample.theme.palette }, language: "en" };
    query.mockResolvedValue({ data: { mode: "preview", templateId: "minimal", content: JSON.stringify(draft) } });
    const r = await loadPublicInvitation("a-b", "tok");
    expect(r.mode).toBe("preview");
    expect(r.invitation.templateId).toBe("minimal");
  });
  it("throws on a backend error so the page shows 'try again', not 'no longer available'", async () => {
    query.mockResolvedValue({ data: null, errors: [{ message: "boom" }] });
    await expect(loadPublicInvitation("a-b")).rejects.toThrow("boom");
  });
});
