// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const pub = vi.hoisted(() => ({ getPublicInvitation: vi.fn() }));
vi.mock("@/InvitationModule/server/publicInvitation", () => pub);
vi.mock("@/InvitationModule/og/fonts", () => ({ ogFonts: vi.fn(async () => []) }));
vi.mock("@/InvitationModule/og/Card", () => ({ InvitationCard: () => null }));
vi.mock("@/InvitationModule/og/cardModel", () => ({ cardModel: vi.fn(() => ({})) }));
vi.mock("next/og", () => ({
  ImageResponse: class extends Response {
    constructor(_element, init) {
      super("png", { status: 200, headers: init.headers });
    }
  },
}));

import { GET } from "./route";

const call = () => GET(new Request("http://localhost/invitation/priya-weds-rahul/card"), { params: { slug: "priya-weds-rahul" } });

beforeEach(() => vi.clearAllMocks());

describe("invitation card route", () => {
  it("renders the card for a live invitation", async () => {
    pub.getPublicInvitation.mockResolvedValue({ mode: "live", invitation: {} });
    const res = await call();
    expect(res.status).toBe(200);
  });
  it("is 404 when the invitation isn't live", async () => {
    pub.getPublicInvitation.mockResolvedValueOnce(null).mockResolvedValueOnce({ mode: "preview", invitation: {} });
    expect((await call()).status).toBe(404);
    expect((await call()).status).toBe(404);
  });
  it("is 503, not cacheable, when the backend fails, so WhatsApp doesn't keep a missing card", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    pub.getPublicInvitation.mockRejectedValue(new Error("AppSync down"));
    const res = await call();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
