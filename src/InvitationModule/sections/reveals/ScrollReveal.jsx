"use client";
import { useEffect, useRef } from "react";

const SWIPE_PX = 30;
const KEYS = ["ArrowDown", "PageDown", " ", "Enter"];

export default function ScrollReveal({ onReveal, className, children }) {
  const fired = useRef(false);
  const fire = useRef(() => {});
  fire.current = () => {
    if (fired.current) return;
    fired.current = true;
    onReveal?.();
  };

  useEffect(() => {
    let startY = null;
    const onWheel = (e) => e.deltaY > 0 && fire.current();
    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (startY !== null && startY - e.touches[0].clientY > SWIPE_PX) fire.current();
    };
    const onKey = (e) => KEYS.includes(e.key) && fire.current();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <button type="button" className={className} onClick={() => fire.current()}>
      {children}
    </button>
  );
}
