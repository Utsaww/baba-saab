"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const button = "inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100";

/** Download-video control for a live invitation. Remount it (key) when the live version changes: any video is then stale. */
export default function VideoButton({ id, make, check, pollMs = 5000 }) {
  const [video, setVideo] = useState(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const next = await check({ id });
    if (alive.current) setVideo(next);
  }, [check, id]);

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  const making = video?.ok && video.status === "making";
  useEffect(() => {
    if (!making) return;
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [making, refresh, pollMs]);

  async function start() {
    const next = await make({ id });
    if (alive.current) setVideo(next);
  }

  if (!video) return null;
  const retry = (
    <button type="button" onClick={start} className={button}>
      Try again
    </button>
  );
  return (
    <div className="flex flex-col items-start gap-1">
      {!video.ok ? (
        <>
          <p role="alert" className="text-sm text-red-700">{video.message}</p>
          {retry}
        </>
      ) : video.status === "making" ? (
        <>
          <button type="button" disabled className={`${button} opacity-60`}>Making video…</button>
          <p className="text-xs text-stone-600">Takes 1–2 minutes. You can keep working.</p>
        </>
      ) : video.status === "ready" ? (
        <>
          <a href={video.url} download={video.fileName} className={button}>Download MP4</a>
          {video.note ? <p className="text-xs text-stone-600">{video.note}</p> : null}
        </>
      ) : video.status === "failed" ? (
        <>
          <p role="alert" className="text-sm text-red-700">Couldn&apos;t make the video. Try again.</p>
          {retry}
        </>
      ) : (
        <button type="button" onClick={start} className={button}>Download video</button>
      )}
    </div>
  );
}
