"use client";
import { useEffect, useRef, useState } from "react";
import { seeded } from "./seeded";

const TAU = Math.PI * 2;
const MAX_STEP = 0.05; // seconds; a long pause never makes petals jump

// Slow-falling gold petals over the card column, started once the envelope has opened.
// Nothing renders on the server or under reduced motion; the canvas never takes taps.
export default function Petals({ active, count = 16, className }) {
  // False on the server and on first paint, so server and client HTML always match.
  const [allowed, setAllowed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setAllowed(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!active || !allowed || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const rand = seeded(1121);
    let width = 0;
    let height = 0;
    // Allocated once; the frame loop only mutates these objects.
    const petals = Array.from({ length: count }, () => ({
      x: rand(),
      y: rand(),
      size: 3 + rand() * 3.5,
      fall: 16 + rand() * 22, // px per second
      sway: 10 + rand() * 18, // px either side
      swaySpeed: 0.4 + rand() * 0.7, // radians per second
      phase: rand() * TAU,
      turn: rand() * TAU,
      spin: (rand() - 0.5) * 1.6, // radians per second
      alpha: 0.25 + rand() * 0.3,
    }));
    const colour = getComputedStyle(canvas).getPropertyValue("--petal").trim() || "#E7C68C";

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let frameId = 0;
    let last = 0;
    function frame(now) {
      const step = last ? Math.min((now - last) / 1000, MAX_STEP) : 1 / 60;
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colour;
      for (const p of petals) {
        p.y += (p.fall * step) / height;
        p.phase += p.swaySpeed * step;
        p.turn += p.spin * step;
        if (p.y > 1.05) {
          p.y = -0.05;
          p.x = rand();
        }
        ctx.save();
        ctx.translate(p.x * width + Math.sin(p.phase) * p.sway, p.y * height);
        ctx.rotate(p.turn);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      frameId = requestAnimationFrame(frame);
    }

    function start() {
      if (frameId) return;
      last = 0;
      frameId = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, allowed, count]);

  if (!active || !allowed) return null;
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
