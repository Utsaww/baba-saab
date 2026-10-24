"use client";
import { forwardRef, useEffect, useRef } from "react";
import st from "./temple.module.scss";
import T from "../../sections/Text";
import { clearedRatio } from "../../sections/reveals/ScratchReveal";
import { UI } from "../../lib/ui-strings";
import { isDevanagari, plainText } from "../../lib/i18n";

const BRUSH = 13; // px radius: the cards are small, so a fingertip-sized brush
const REVEAL_AT = 0.5;
const CHECK_EVERY = 4; // moves between (sampled) coverage checks
const FALLBACK = { gold: "#C4A052", soft: "#E2CE9A" };

// Brushed gold foil with a soft sheen and a few glints, painted in the palette's golds.
function paintFoil(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const style = getComputedStyle(canvas);
  const gold = style.getPropertyValue("--gold").trim() || FALLBACK.gold;
  const soft = style.getPropertyValue("--gold-soft").trim() || FALLBACK.soft;

  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, gold);
  sheen.addColorStop(0.45, soft);
  sheen.addColorStop(0.55, soft);
  sheen.addColorStop(1, gold);
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // Fine diagonal brushing.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = -h; x < w; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.stroke();
  }
  // A few fixed glints (the same on every card, so nothing random reaches the markup).
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#fffaf0";
  for (const [fx, fy, r] of [[0.18, 0.28, 1.4], [0.72, 0.2, 1.1], [0.55, 0.72, 1.3], [0.86, 0.62, 0.9], [0.32, 0.8, 1]]) {
    ctx.beginPath();
    ctx.arc(fx * w, fy * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// One scratch card: a label above, the value under gold foil, and a "Scratch" hint below.
// Pointer or touch scratching reveals it at about half cleared. A keyboard (or screen reader) click
// reveals it at once; a mouse click or tap doesn't, so tapping never skips the scratching.
export const ScratchCard = forwardRef(function ScratchCard({ label, value, lang, revealed, onReveal }, buttonRef) {
  const canvasRef = useRef(null);
  const scratching = useRef(false);
  const last = useRef(null);
  const moves = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    if (revealed) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return undefined;
    let size = "";
    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const next = `${Math.round(width)}x${Math.round(height)}:${window.devicePixelRatio || 1}`;
      if (next === size) return; // mobile URL bars fire resize constantly; repaint only on a real change
      size = next;
      paintFoil(canvas, ctx);
      last.current = null;
    };
    paint();
    // The button's CSS gradient covered the value until now; the canvas takes over.
    if (canvas.parentElement) canvas.parentElement.dataset.painted = "true";
    // A new size (rotation, the scrollbar returning as the opening closes) would stretch the foil
    // and offset the brush, so repaint it fresh. Any scratching so far starts over.
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [revealed]);

  function finish() {
    if (done.current) return;
    done.current = true;
    onReveal?.();
  }

  function point(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return [(e.clientX ?? 0) - rect.left, (e.clientY ?? 0) - rect.top];
  }

  function scratchTo(e) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return;
    const [x, y] = point(e);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineWidth = BRUSH * 2;
    ctx.beginPath();
    if (last.current) {
      ctx.moveTo(...last.current);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
      ctx.fill();
    }
    last.current = [x, y];
    moves.current += 1;
    if (moves.current % CHECK_EVERY === 0 && clearedRatio(ctx, canvas.width, canvas.height) >= REVEAL_AT) finish();
  }

  function onPointerDown(e) {
    scratching.current = true;
    last.current = null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    scratchTo(e);
  }
  function onPointerMove(e) {
    if (scratching.current || e.buttons) scratchTo(e);
  }
  function onPointerEnd() {
    scratching.current = false;
    last.current = null;
  }

  const valueLang = isDevanagari(value) ? "hi" : undefined;
  return (
    <div className={st.card} data-revealed={revealed}>
      <T as="p" v={label} lang={lang} className={st.cardLabel} />
      <div className={st.cardFace}>
        <span className={st.cardValue} data-part="value" lang={valueLang} aria-hidden={revealed ? undefined : "true"}>
          {value}
        </span>
        {!revealed && (
          <button
            ref={buttonRef}
            type="button"
            className={st.cardFoil}
            aria-label={`${plainText(label, lang)}: ${plainText(UI.scratchCard, lang)}`}
            onClick={(e) => {
              if (e.detail === 0) finish();
            }}
          >
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onLostPointerCapture={onPointerEnd}
            />
          </button>
        )}
      </div>
      {/* The button's label already says "scratch"; this is the visible cue. */}
      <div className={st.cardHint} aria-hidden="true">
        <T v={UI.scratch} lang={lang} />
      </div>
    </div>
  );
});

const LABELS = [UI.month, UI.date, UI.year];

// The three cards — Month, Date, Year — for the wedding date.
export default function ScratchDate({ parts, lang, revealed, onReveal, cardRefs }) {
  const values = [parts.month, parts.day, parts.year];
  return (
    <div className={st.cards}>
      {values.map((value, i) => (
        <ScratchCard
          key={i}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          label={LABELS[i]}
          value={value}
          lang={lang}
          revealed={revealed[i]}
          onReveal={() => onReveal(i)}
        />
      ))}
    </div>
  );
}
