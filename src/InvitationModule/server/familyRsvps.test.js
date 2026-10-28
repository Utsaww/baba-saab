import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@aws-amplify/adapter-nextjs/data", () => ({ generateServerClientUsingReqRes: () => ({ queries: { familyRsvps: query } }) }));
vi.mock("@/AdminModule/auth/amplifyServer", () => ({ outputs: {}, runWithAmplifyServerContext: ({ operation }) => operation({}) }));
vi.mock("react", async (orig) => ({ ...(await orig()), cache: (fn) => fn }));

import { loadFamilyRsvps } from "./familyRsvps";

const view = { couple: { bride: "A", groom: "B", order: "bride-first" }, language: "en", events: [], rows: [{ name: "X" }] };
beforeEach(() => query.mockReset());

describe("loadFamilyRsvps", () => {
  it("returns null for null data", async () => {
    query.mockResolvedValue({ data: null });
    expect(await loadFamilyRsvps("a-b", "tok")).toBeNull();
    expect(query).toHaveBeenCalledWith({}, { slug: "a-b", token: "tok" });
  });
  it("parses object, string and double-encoded results", async () => {
    for (const data of [view, JSON.stringify(view), JSON.stringify(JSON.stringify(view))]) {
      query.mockResolvedValue({ data });
      expect(await loadFamilyRsvps("a-b", "tok")).toEqual(view);
    }
  });
  it("throws on backend errors", async () => {
    query.mockResolvedValue({ data: null, errors: [{ message: "down" }] });
    await expect(loadFamilyRsvps("a-b", "tok")).rejects.toThrow("down");
  });
});
