"use client";
import { useEffect } from "react";

// Fades sections up as they scroll into view. Sections start visible in the HTML, so without
// JavaScript, IntersectionObserver or with reduced motion nothing is ever hidden.
export default function useFadeUp(ref, { pending, shown, selector = "[data-section]" }) {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    // The first report for each section says where it starts. Sections already on screen are
    // left alone (hiding them would flash); the rest are hidden and fade up when they arrive.
    const placed = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          const first = !placed.has(target);
          placed.add(target);
          if (!isIntersecting) {
            if (first) target.classList.add(pending);
            continue;
          }
          if (!first) target.classList.add(shown);
          observer.unobserve(target);
        }
      },
      { threshold: 0.08 },
    );
    for (const el of root.querySelectorAll(selector)) observer.observe(el);
    return () => observer.disconnect();
  }, [ref, pending, shown, selector]);
}
