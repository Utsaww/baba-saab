"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const tryPlay = (audio) => Promise.resolve(audio.play());

// Events that grant user activation on every platform. pointerdown only counts for a mouse, and
// pointermove/touchmove/wheel never count, so phones would reject play() from those.
const ACTIVATION_EVENTS = ["click", "touchend", "keydown"];
const CAPTURE = { capture: true };

const onToggleButton = (e) => Boolean(e.target?.closest?.("[data-music-toggle]"));

function listen(handler) {
  for (const type of ACTIVATION_EVENTS) window.addEventListener(type, handler, CAPTURE);
}
function unlisten(handler) {
  for (const type of ACTIVATION_EVENTS) window.removeEventListener(type, handler, CAPTURE);
}

export default function useMusic(src) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const wanted = useRef(false); // play() was requested and not since paused via toggle()
  const priming = useRef(false); // a silent unlock play() is in flight

  const retry = useRef(null);
  const cancelRetry = useCallback(() => {
    if (retry.current) unlisten(retry.current);
    retry.current = null;
  }, []);

  // Browsers only allow audio during a user activation; if a play() didn't get one (e.g. after a scratch
  // or a swipe), retry on the next tap, click or key press.
  // A tap on the music button is left to toggle(), otherwise the retry would start the music and toggle would stop it.
  const armRetry = useCallback(
    (a) => {
      cancelRetry();
      const handler = (e) => {
        if (onToggleButton(e)) return;
        tryPlay(a).then(
          () => {
            if (retry.current === handler) cancelRetry();
          },
          () => {},
        );
      };
      retry.current = handler;
      listen(handler);
    },
    [cancelRetry],
  );

  useEffect(() => {
    if (!src) return undefined;
    const a = new Audio(src);
    a.loop = true;
    a.preload = "none";
    const onPlay = () => {
      if (priming.current && !wanted.current) return; // the silent unlock is not "playing"
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    audio.current = a;

    // iOS only lets a later programmatic play() through (e.g. Temple's reveal 900 ms after the tap) if
    // the element was started during a gesture. So on the guest's first activation, start it muted and
    // stop it again, unless the real play() has been requested by then.
    const prime = () => {
      priming.current = true;
      a.muted = true;
      tryPlay(a)
        .then(() => {
          priming.current = false;
          if (wanted.current) {
            a.muted = false;
            setPlaying(!a.paused);
            return;
          }
          a.pause();
          try {
            a.currentTime = 0;
          } catch {
            // Some browsers refuse seeking before metadata loads; the track then resumes where it stopped.
          }
          a.muted = false;
        })
        .catch(() => {
          priming.current = false;
          a.muted = false;
          if (wanted.current) armRetry(a);
        });
    };

    const unlock = (e) => {
      if (onToggleButton(e)) return; // the toggle's own play() is in the gesture already
      unlisten(unlock);
      if (!wanted.current) prime();
      else if (a.paused && !retry.current) tryPlay(a).catch(() => {});
      // With a retry pending, the retry listener handles this same event.
    };
    listen(unlock);

    return () => {
      unlisten(unlock);
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      audio.current = null;
      priming.current = false;
      wanted.current = false;
    };
  }, [src, armRetry]);

  const play = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    wanted.current = true;
    if (priming.current) {
      // The silent unlock is already running: keep it going and let it unmute when it settles.
      a.muted = false;
      return;
    }
    tryPlay(a).catch(() => armRetry(a));
  }, [armRetry]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    cancelRetry();
    if (a.paused || priming.current) {
      wanted.current = true;
      a.muted = false;
      if (!priming.current) tryPlay(a).catch(() => {});
    } else {
      wanted.current = false;
      a.pause();
    }
  }, [cancelRetry]);

  useEffect(() => cancelRetry, [cancelRetry]);

  return { enabled: Boolean(src), playing, play, toggle };
}
