import { describe, expect, it } from "vitest";
import { MAKING_TIMEOUT_MS, readState, videoFileName } from "./video";

const NOW = Date.parse("2026-11-04T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const live = { status: "published", liveVersion: 3, videoStatus: "ready", videoLiveVersion: 3 };

describe("readState", () => {
  it("ready only for the current live version", () => {
    expect(readState(live, NOW)).toBe("ready");
  });
  it("stale video after Update live", () => {
    expect(readState({ ...live, liveVersion: 4 }, NOW)).toBe("none");
  });
  it("making older than 5 min reads as failed", () => {
    const making = { ...live, videoStatus: "making" };
    expect(readState({ ...making, videoStartedAt: ago(MAKING_TIMEOUT_MS + 1000) }, NOW)).toBe("failed");
    expect(readState({ ...making, videoStartedAt: ago(4 * 60 * 1000) }, NOW)).toBe("making");
  });
  it("making for an older live version reads as none", () => {
    expect(readState({ ...live, videoStatus: "making", videoLiveVersion: 2, videoStartedAt: ago(1000) }, NOW)).toBe("none");
  });
  it("not live → none", () => {
    expect(readState({ ...live, status: "offline" }, NOW)).toBe("none");
  });
  it("failed and never-rendered", () => {
    expect(readState({ ...live, videoStatus: "failed" }, NOW)).toBe("failed");
    expect(readState({ status: "published", liveVersion: 3 }, NOW)).toBe("none");
  });
});

describe("videoFileName", () => {
  it("uses the link name", () => {
    expect(videoFileName("rahul-priya")).toBe("rahul-priya-invitation.mp4");
    expect(videoFileName(undefined)).toBe("invitation.mp4");
  });
});
