import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireStaff: vi.fn() }));
vi.mock("@/AdminModule/auth/server", () => auth);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const data = vi.hoisted(() => ({
  getInvitation: vi.fn(), slugOwner: vi.fn(), setSlugRecord: vi.fn(), regenerateTokenRecord: vi.fn(),
  publishRecord: vi.fn(), updateLiveRecord: vi.fn(),
}));
vi.mock("./data", () => data);

import { checkSlugAction, newPreviewLinkAction, publishAction, setSlugAction, updateLiveAction } from "./publishActions";

const ready = {
  templateId: "minimal", theme: { palette: "ivory" }, language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14", venue: { name: { en: "Rambagh" }, address: { en: "Jaipur" } }, events: [],
};
const inv = (over = {}) => ({ id: "inv-1", version: 4, status: "draft", slug: "priya-weds-rahul-k3f9", content: ready, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  auth.requireStaff.mockResolvedValue({ email: "s@x.com" });
});

describe("requireStaff gate", () => {
  it("is called first by every action and blocks when it rejects", async () => {
    auth.requireStaff.mockRejectedValue(new Error("redirect"));
    const calls = [
      () => checkSlugAction({ id: "inv-1", slug: "free-name" }),
      () => setSlugAction({ id: "inv-1", slug: "free-name" }),
      () => newPreviewLinkAction({ id: "inv-1" }),
      () => publishAction({ id: "inv-1", expectedVersion: 4, slug: "free-name" }),
      () => updateLiveAction({ id: "inv-1", expectedVersion: 4 }),
    ];
    for (const call of calls) await expect(call()).rejects.toThrow("redirect");
    for (const fn of Object.values(data)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("checkSlugAction", () => {
  it("rejects invalid names without a lookup", async () => {
    expect(await checkSlugAction({ id: "inv-1", slug: "Bad" })).toEqual({ status: "invalid", message: "Use only lowercase letters, numbers and dashes." });
    expect(data.slugOwner).not.toHaveBeenCalled();
  });
  it("is available when free or already ours", async () => {
    data.slugOwner.mockResolvedValueOnce(null).mockResolvedValueOnce("inv-1");
    expect((await checkSlugAction({ id: "inv-1", slug: "free-name" })).status).toBe("available");
    expect((await checkSlugAction({ id: "inv-1", slug: "our-name" })).status).toBe("available");
  });
  it("is taken when another invitation owns it", async () => {
    data.slugOwner.mockResolvedValue("inv-2");
    expect((await checkSlugAction({ id: "inv-1", slug: "their-name" })).status).toBe("taken");
  });
});

describe("publishAction", () => {
  it("refuses when the checklist fails, listing what's missing", async () => {
    data.getInvitation.mockResolvedValue(inv({ content: { ...ready, mainDate: undefined } }));
    const r = await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-weds-rahul-k3f9" });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("Add the wedding date");
    expect(data.publishRecord).not.toHaveBeenCalled();
  });
  it("is a conflict when the stored version moved on", async () => {
    data.getInvitation.mockResolvedValue(inv({ version: 5 }));
    expect(await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-weds-rahul-k3f9" })).toEqual({ ok: false, conflict: true });
  });
  it("saves a changed link name first, then publishes", async () => {
    data.getInvitation.mockResolvedValue(inv());
    data.setSlugRecord.mockResolvedValue({ data: { slug: "priya-rahul" } });
    data.publishRecord.mockResolvedValue({ data: { status: "published", liveVersion: 4, publishedAt: "t", liveUpdatedAt: "t" } });
    const r = await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-rahul" });
    expect(data.setSlugRecord).toHaveBeenCalledWith({ id: "inv-1", slug: "priya-rahul" });
    expect(r).toEqual({ ok: true, status: "published", slug: "priya-rahul", liveVersion: 4, publishedAt: "t", liveUpdatedAt: "t" });
  });
  it("maps a taken slug", async () => {
    data.getInvitation.mockResolvedValue(inv());
    data.setSlugRecord.mockResolvedValue({ errors: [{ errorType: "SlugTaken" }] });
    expect(await publishAction({ id: "inv-1", expectedVersion: 4, slug: "taken" })).toEqual({
      ok: false, message: "That link name was just taken — try another.",
    });
  });
  it("never leaks a raw error message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    data.getInvitation.mockRejectedValue(new Error("secret internals"));
    const r = await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-weds-rahul-k3f9" });
    expect(r).toEqual({ ok: false, message: "Couldn't publish. Check your connection and try again." });
  });
});

describe("updateLiveAction", () => {
  it("pushes live after the checklist passes", async () => {
    data.getInvitation.mockResolvedValue(inv({ status: "published", version: 9 }));
    data.updateLiveRecord.mockResolvedValue({ data: { liveVersion: 9, liveUpdatedAt: "t" } });
    expect(await updateLiveAction({ id: "inv-1", expectedVersion: 9 })).toEqual({ ok: true, liveVersion: 9, liveUpdatedAt: "t" });
  });
});

describe("newPreviewLinkAction", () => {
  it("returns the new token", async () => {
    data.regenerateTokenRecord.mockResolvedValue({ data: { previewToken: "abc" } });
    expect(await newPreviewLinkAction({ id: "inv-1" })).toEqual({ ok: true, previewToken: "abc" });
  });
});

describe("setSlugAction", () => {
  it("validates before saving", async () => {
    expect(await setSlugAction({ id: "inv-1", slug: "ab" })).toEqual({ ok: false, message: "Use 3 to 60 characters." });
  });
});
