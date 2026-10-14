import { describe, expect, it } from "vitest";
import { LIVE_BADGE, liveState } from "./liveState";

describe("liveState", () => {
  it("is draft until published", () => expect(liveState({ status: "draft", version: 5, liveVersion: null })).toBe("draft"));
  it("is live when the live copy is the latest save", () =>
    expect(liveState({ status: "published", version: 7, liveVersion: 7 })).toBe("live"));
  it("has changes when a later save is not live", () =>
    expect(liveState({ status: "published", version: 8, liveVersion: 7 })).toBe("changes"));
  it("labels each state", () => expect(LIVE_BADGE).toEqual({ draft: "Draft", live: "Live", changes: "Changes not live" }));
});
