export type VideoStatus = "none" | "making" | "ready" | "failed";
type Inv = {
  status?: string;
  liveVersion?: number;
  videoStatus?: string;
  videoLiveVersion?: number;
  videoStartedAt?: string;
};

// The render Lambda times out at 290 s; past this a "making" job is dead and can be started again.
export const MAKING_TIMEOUT_MS = 5 * 60 * 1000;

/** What staff see. A video belongs to one live version: Update live makes the old one stale. */
export function readState(inv: Inv, now: number): VideoStatus {
  if (inv.status !== "published") return "none";
  if (inv.videoStatus === "making") {
    const started = Date.parse(inv.videoStartedAt ?? "");
    return Number.isNaN(started) || now - started > MAKING_TIMEOUT_MS ? "failed" : "making";
  }
  if (inv.videoLiveVersion !== inv.liveVersion) return "none";
  return inv.videoStatus === "ready" || inv.videoStatus === "failed" ? inv.videoStatus : "none";
}

export const videoFileName = (slug?: string) => (slug ? `${slug}-invitation.mp4` : "invitation.mp4");
