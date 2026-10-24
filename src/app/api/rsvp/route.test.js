import { beforeEach, describe, expect, it, vi } from "vitest";

const mutation = vi.hoisted(() => vi.fn());
const make = vi.hoisted(() => vi.fn());
const run = vi.hoisted(() => vi.fn());
vi.mock("@aws-amplify/adapter-nextjs/data", () => ({
  generateServerClientUsingReqRes: (cfg) => (make(cfg), { mutations: { submitRsvp: mutation } }),
}));
vi.mock("@/AdminModule/auth/amplifyServer", () => ({
  outputs: { o: 1 },
  runWithAmplifyServerContext: (a) => (run(a.nextServerContext), a.operation({})),
}));
import { createHash } from "node:crypto";

import { POST } from "./route";

const req = (body, headers = {}) =>
  new Request("http://x/api/rsvp", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const reply = { name: "Asha", attending: "yes" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mutation.mockReset();
  mutation.mockResolvedValue({ data: JSON.stringify({ ok: true, updated: false }) });
});

describe("POST /api/rsvp", () => {
  it("returns ok and updated, passing slug, reply JSON and an ip hash", async () => {
    const res = await POST(req({ slug: "a-b", reply }, { "x-forwarded-for": "1.1.1.1, 2.2.2.2" }));
    expect(await res.json()).toEqual({ ok: true, updated: false });
    const [, args] = mutation.mock.calls[0];
    expect(args.slug).toBe("a-b");
    expect(JSON.parse(args.reply)).toEqual(reply);
    expect(args.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("uses the guest identity pool and no server context, and hashes sha256(ip + salt)", async () => {
    expect(make).toHaveBeenCalledWith({ config: { o: 1 }, authMode: "identityPool" });
    await POST(req({ slug: "a-b", reply }, { "x-forwarded-for": "1.1.1.1" }));
    expect(run).toHaveBeenCalledWith(null);
    expect(mutation.mock.calls[0][1].ipHash).toBe(createHash("sha256").update("1.1.1.1baba-saab-rsvp").digest("hex"));
  });
  it("hashes the first forwarded IP: same IP same hash, different IP different hash", async () => {
    const hashOf = async (h) => { mutation.mockClear(); await POST(req({ slug: "a-b", reply }, h)); return mutation.mock.calls[0][1].ipHash; };
    const a = await hashOf({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" });
    expect(await hashOf({ "x-forwarded-for": "1.1.1.1" })).toBe(a);
    expect(await hashOf({ "x-forwarded-for": "2.2.2.2" })).not.toBe(a);
    expect(await hashOf({ "x-real-ip": "1.1.1.1" })).toBe(a);
    expect(await hashOf({})).toMatch(/^[0-9a-f]{64}$/);
  });
  it.each([["Closed", "closed"], ["RateLimited", "rate"], ["Invalid", "invalid"], ["NotFound", "invalid"], ["Weird", "error"]])(
    "maps errorType %s to %s", async (errorType, reason) => {
      mutation.mockResolvedValue({ data: null, errors: [{ errorType, message: "m" }] });
      expect(await (await POST(req({ slug: "a-b", reply }))).json()).toEqual({ ok: false, reason });
    });
  it("maps a thrown error to error", async () => {
    mutation.mockRejectedValue(new Error("boom"));
    expect(await (await POST(req({ slug: "a-b", reply }))).json()).toEqual({ ok: false, reason: "error" });
  });
  it("answers invalid for a missing slug, a missing reply or a bad body, without calling the backend", async () => {
    const bad = [
      { reply }, { slug: "a-b" }, { slug: 5, reply }, "not json",
      { slug: "ab", reply }, { slug: "A-B", reply }, { slug: "a".repeat(61), reply }, { slug: "a b", reply },
      { slug: "a-b", reply: { ...reply, name: 5 } }, { slug: "a-b", reply: { ...reply, guestCount: "2" } },
      { slug: "a-b", reply: { ...reply, eventIds: "e1" } }, { slug: "a-b", reply: { ...reply, eventIds: [1] } },
      { slug: "a-b", reply: [] },
      { slug: "a-b", reply: { ...reply, message: "x".repeat(11000) } },
    ];
    for (const b of bad) {
      expect(await (await POST(req(b))).json()).toEqual({ ok: false, reason: "invalid" });
    }
    expect(mutation).not.toHaveBeenCalled();
  });
});
