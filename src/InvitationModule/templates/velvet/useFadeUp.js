"use client";
import { useEffect } from "react";

// Fades sections up as they scroll into view. Sections start visible in the HTML, so without
// JavaScript, IntersectionObserver or with reduced motion nothing is ever hidden.
export default function useFadeUp(ref, { pending, shown, selector = "[data-section]" }) {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(shown);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of root.querySelectorAll(selector)) {
      el.classList.add(pending);
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ref, pending, shown, selector]);
}
