"use client";
import { useEffect, useRef, useState } from "react";
import { seeded } from "../../lib/seeded";

export const SPARKLE_MS = 1800;
const COUNT = 72;
const TAU = Math.PI * 2;
const GRAVITY = 150; // px per second², so glints arc up and drift back down
const FALLBACK = ["#C4A052", "#E2CE9A"];
const WHITE_GOLD = "#FFF4D6";

// A four-point glint: two thin crossing diamonds with curved sides.
function glint(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// A short burst of gold glints rising from the envelope's mouth as the flap opens.
// The canvas exists only for the burst: nothing on the server, under reduced motion or afterwards.
// `mouth` is the envelope's top edge as a fraction of the canvas height.
export default function Sparkles({ active, className, mouth = 0.46 }) {
  const [allowed, setAllowed] = useState(false); // false on the server and first paint, so HTML matches
  const [spent, setSpent] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setAllowed(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!active || !allowed || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 320;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const style = getComputedStyle(canvas);
    const colours = [
      style.getPropertyValue("--gold").trim() || FALLBACK[0],
      style.getPropertyValue("--gold-soft").trim() || FALLBACK[1],
      WHITE_GOLD,
    ];
    const rand = seeded(2711);
    const half = width * 0.3; // the mouth spans most of the envelope's width
    const glints = Array.from({ length: COUNT }, (_, i) => ({
      x: width / 2 + (rand() * 2 - 1) * half,
      y: height * mouth + rand() * 8,
      vx: (rand() * 2 - 1) * 55,
      vy: -(80 + rand() * 180),
      delay: 0.12 + rand() * 0.5, // seconds: they start as the flap lifts
      life: 0.6 + rand() * 0.55,
      size: 1.1 + rand() * 2.4,
      star: rand() < 0.45,
      colour: colours[i % colours.length],
      twinkle: rand() * TAU,
    }));

    let frameId = 0;
    let start = null;
    function frame(now) {
      if (start === null) start = now;
      ctx.clearRect(0, 0, width, height);
      if (now - start >= SPARKLE_MS) {
        frameId = 0;
        setSpent(true);
        return;
      }
      const t = (now - start) / 1000;
      ctx.globalCompositeOperation = "lighter";
      for (const g of glints) {
        const age = t - g.delay;
        if (age < 0 || age > g.life) continue;
        const k = age / g.life;
        const x = g.x + g.vx * age;
        const y = g.y + g.vy * age + 0.5 * GRAVITY * age * age;
        ctx.globalAlpha = Math.max(0, Math.sin(Math.PI * k) * (0.7 + 0.3 * Math.sin(g.twinkle + age * 20)));
        ctx.fillStyle = g.colour;
        ctx.shadowColor = g.colour;
        ctx.shadowBlur = g.size * 4;
        if (g.star) glint(ctx, x, y, g.size * 2.6 * (1 - k * 0.4));
        else {
          ctx.beginPath();
          ctx.arc(x, y, g.size * (1 - k * 0.5), 0, TAU);
          ctx.fill();
        }
      }
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [active, allowed, mouth]);

  if (!active || !allowed || spent) return null;
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
