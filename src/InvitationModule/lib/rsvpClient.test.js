import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postRsvp } from "./rsvpClient";

const reply = { name: "Sharma Parivar", phone: "9876543210", attending: "yes", eventIds: [] };
const json = (body) => ({ json: async () => body });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("postRsvp", () => {
  it("POSTs { slug, reply } to /api/rsvp and returns the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, updated: false }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await postRsvp("meera", reply)).toEqual({ ok: true, updated: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/rsvp");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ slug: "meera", reply });
  });

  it("passes the route's refusal reasons through", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ok: false, reason: "rate" })));
    expect(await postRsvp("meera", reply)).toEqual({ ok: false, reason: "rate" });
  });

  it("returns an error for a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await postRsvp("meera", reply)).toEqual({ ok: false, reason: "error" });
  });

  it("returns an error for an answer that isn't JSON or isn't an answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => { throw new SyntaxError("bad"); } }));
    expect(await postRsvp("meera", reply)).toEqual({ ok: false, reason: "error" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json("<html>")));
    expect(await postRsvp("meera", reply)).toEqual({ ok: false, reason: "error" });
  });

  it("aborts a hung request after the timeout and returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))),
    );
    const pending = postRsvp("meera", reply);
    await vi.advanceTimersByTimeAsync(7999);
    let settled = false;
    pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false, reason: "error" });
  });

  it("honours a shorter timeout", async () => {
    vi.stubGlobal("fetch", vi.fn((_u, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("x"))))));
    const pending = postRsvp("meera", reply, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ ok: false, reason: "error" });
  });
});
