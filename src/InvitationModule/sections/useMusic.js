"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const tryPlay = (audio) => Promise.resolve(audio.play());

export default function useMusic(src) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!src) return undefined;
    const a = new Audio(src);
    a.loop = true;
    a.preload = "none";
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    audio.current = a;
    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      audio.current = null;
    };
  }, [src]);

  // Browsers only allow audio after a tap; if this gesture didn't count (e.g. a scroll), retry on the next tap.
  const play = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    tryPlay(a).catch(() => {
      window.addEventListener("pointerdown", () => tryPlay(a).catch(() => {}), { once: true });
    });
  }, []);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) tryPlay(a).catch(() => {});
    else a.pause();
  }, []);

  return { enabled: Boolean(src), playing, play, toggle };
}
