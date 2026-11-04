"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const button = "inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100";
const UNREACHABLE = { ok: false, message: "Couldn't reach the video service. Check your connection and try again." };

/** Download-video control for a live invitation. Remount it (key) when the live version changes: any video is then stale. */
export default function VideoButton({ id, make, check, pollMs = 5000 }) {
  const [video, setVideo] = useState(null);
  const alive = useRef(true);
  const latest = useRef(0);

  // Runs one action. A result older than the latest request is dropped; a rejected call becomes the "couldn't reach" state.
  const call = useCallback(
    async (action) => {
      const n = ++latest.current;
      let next;
      try {
        next = await action({ id });
      } catch {
        next = UNREACHABLE;
      }
      if (alive.current && n === latest.current) setVideo(next);
      return next;
    },
    [id],
  );

  useEffect(() => {
    alive.current = true;
    call(check);
    return () => {
      alive.current = false;
    };
  }, [call, check]);

  // The next check is scheduled only after the previous result is in (`video` changes), so polls never overlap.
  useEffect(() => {
    if (!(video?.ok && video.status === "making")) return;
    const timer = setTimeout(() => call(check), pollMs);
    return () => clearTimeout(timer);
  }, [video, call, check, pollMs]);

  // The link in state may have expired: ask again, and only go on if the video is still ready.
  async function download() {
    const fresh = await call(check);
    if (alive.current && fresh.ok && fresh.status === "ready") window.location.assign(fresh.url);
  }

  if (!video) return null;
  const retry = (
    <button type="button" onClick={() => call(make)} className={button}>
      Try again
    </button>
  );
  const failed = (text) => (
    <>
      <p role="alert" className="text-sm text-red-700">{text}</p>
      {retry}
    </>
  );
  const status = video.ok ? video.status : null;
  return (
    <div className="flex flex-col items-start gap-1">
      {!video.ok ? (
        failed(video.message)
      ) : status === "making" ? (
        <>
          <button type="button" disabled className={`${button} opacity-60`}>Making video…</button>
          <p className="text-xs text-stone-600">Takes 1–2 minutes. You can keep working.</p>
        </>
      ) : status === "ready" ? (
        <>
          <button type="button" onClick={download} className={button}>Download MP4</button>
          {video.note ? <p className="text-xs text-stone-600">{video.note}</p> : null}
        </>
      ) : status === "none" ? (
        <button type="button" onClick={() => call(make)} className={button}>Download video</button>
      ) : (
        failed("Couldn't make the video. Try again.")
      )}
    </div>
  );
}
