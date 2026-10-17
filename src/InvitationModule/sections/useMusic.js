"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const tryPlay = (audio) => Promise.resolve(audio.play());

// Events that grant user activation on every platform. pointerdown only counts for a mouse, and
// pointermove/touchmove/wheel never count, so phones would reject play() from those.
const ACTIVATION_EVENTS = ["click", "touchend", "keydown"];
const CAPTURE = { capture: true };

const onToggleButton = (e) => Boolean(e.target?.closest?.("[data-music-toggle]"));

// Music eases in rather than starting at full blast, and eases out when turned off.
const VOLUME = 0.45;
const FADE_IN_MS = 1500;
const FADE_OUT_MS = 400;
const FADE_STEP_MS = 50;
const reducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// The guest's "music off" is remembered on their device. Storage may be refused; then it isn't.
const MUTED_KEY = "music:muted";
function readMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}
function writeMuted(muted) {
  try {
    if (muted) localStorage.setItem(MUTED_KEY, "1");
    else localStorage.removeItem(MUTED_KEY);
  } catch {
    // Not remembered; this visit still honours the choice.
  }
}

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
  const userPaused = useRef(false); // the guest turned music off with the toggle (now or on an earlier visit)
  const stopping = useRef(false); // fading out before the pause

  const fade = useRef(null);
  const cancelFade = useCallback(() => {
    if (fade.current) clearInterval(fade.current);
    fade.current = null;
  }, []);
  // Ramp the volume to `to` in small steps; under reduced motion, jump straight there.
  const fadeTo = useCallback(
    (a, to, ms, done) => {
      cancelFade();
      if (reducedMotion()) {
        a.volume = to;
        done?.();
        return;
      }
      const from = a.volume;
      const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
      let step = 0;
      fade.current = setInterval(() => {
        if (audio.current !== a) return cancelFade();
        step += 1;
        a.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / steps));
        if (step >= steps) {
          cancelFade();
          a.volume = to;
          done?.();
        }
      }, FADE_STEP_MS);
    },
    [cancelFade],
  );
  const fadeIn = useCallback(
    (a) => {
      a.volume = 0;
      fadeTo(a, VOLUME, FADE_IN_MS);
    },
    [fadeTo],
  );

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
    const current = () => audio.current === a;
    userPaused.current = readMuted();

    // iOS only lets a later programmatic play() through (e.g. Temple's reveal 900 ms after the tap) if
    // the element was started during a gesture. So until the element has started once, each activation
    // starts it muted and stops it again, unless the real play() has been requested by then. A "play"
    // event means the browser allowed it, so listening stops there.
    const unlock = (e) => {
      if (priming.current || onToggleButton(e)) return; // the toggle's own play() is in the gesture already
      if (!wanted.current) prime();
      else if (a.paused && !retry.current) tryPlay(a).catch(() => {});
      // With a retry pending, the retry listener handles this same event.
    };

    const onPlay = () => {
      unlisten(unlock);
      if (priming.current && !wanted.current) return; // the silent unlock is not "playing"
      setPlaying(true);
      if (!priming.current) fadeIn(a); // a prime that becomes real fades in when it settles
    };
    const onPause = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    audio.current = a;

    const prime = () => {
      priming.current = true;
      a.muted = true;
      tryPlay(a)
        .then(() => {
          if (!current()) return;
          priming.current = false;
          a.muted = false;
          if (wanted.current) {
            setPlaying(!a.paused);
            if (!a.paused) fadeIn(a);
            return;
          }
          a.pause();
          try {
            a.currentTime = 0;
          } catch {
            // Some browsers refuse seeking before metadata loads; the track then resumes where it stopped.
          }
        })
        .catch(() => {
          if (!current()) return;
          priming.current = false;
          a.muted = false;
          setPlaying(false);
          // Not a real activation after all (e.g. the end of a pan): unlock keeps listening.
          if (wanted.current) armRetry(a);
        });
    };

    listen(unlock);

    return () => {
      unlisten(unlock);
      cancelRetry();
      cancelFade();
      stopping.current = false;
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      audio.current = null;
      priming.current = false;
      wanted.current = false;
      userPaused.current = false;
    };
  }, [src, armRetry, cancelRetry, cancelFade, fadeIn]);

  const play = useCallback(() => {
    const a = audio.current;
    if (!a || userPaused.current) return; // the guest turned music off; the reveal doesn't override that
    wanted.current = true;
    if (priming.current) {
      // The silent unlock is already running: keep it going and let it unmute (and fade in) when it settles.
      a.volume = 0;
      a.muted = false;
      return;
    }
    tryPlay(a).catch(() => {
      if (audio.current === a) armRetry(a);
    });
  }, [armRetry]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    cancelRetry();
    // While priming the element is running but not audibly "on": each tap flips the guest's intent,
    // and the prime honours the last one when it settles. While fading out it counts as off.
    const on = priming.current ? !wanted.current : a.paused || stopping.current;
    wanted.current = on;
    userPaused.current = !on;
    writeMuted(!on);
    if (priming.current) {
      if (on) a.volume = 0;
      a.muted = !on;
      setPlaying(on);
    } else if (on && stopping.current) {
      // Turned back on mid fade-out: it never stopped, so ease back up.
      stopping.current = false;
      setPlaying(true);
      fadeTo(a, VOLUME, FADE_IN_MS);
    } else if (on) {
      tryPlay(a).catch(() => {});
    } else {
      // The button shows "off" at once; the sound eases out, then pauses.
      stopping.current = true;
      setPlaying(false);
      fadeTo(a, 0, FADE_OUT_MS, () => {
        stopping.current = false;
        if (audio.current === a) a.pause();
      });
    }
  }, [cancelRetry, fadeTo]);

  useEffect(() => cancelRetry, [cancelRetry]);
  useEffect(() => cancelFade, [cancelFade]);

  return { enabled: Boolean(src), playing, play, toggle };
}
