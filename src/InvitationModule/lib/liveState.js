export const LIVE_BADGE = { draft: "Draft", live: "Live", changes: "Changes not live" };

/** Where an invitation stands for guests: not published, live and current, or live with saved edits not yet pushed. */
export function liveState({ status, version, liveVersion }) {
  if (status !== "published") return "draft";
  return Number.isInteger(liveVersion) && version > liveVersion ? "changes" : "live";
}
