"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const BRUSH_RADIUS = 24;
const REVEAL_AT = 0.5;
const CHECK_EVERY_MOVES = 8;
const SAMPLE_STRIDE = 16;
const FALLBACK_COLOUR = "#c9a54c";

function clearedRatio(ctx, width, height) {
  if (!width || !height) return 0;
  const { data } = ctx.getImageData(0, 0, width, height);
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 4 * SAMPLE_STRIDE) {
    total += 1;
    if (data[i] === 0) clear += 1;
  }
  return total ? clear / total : 0;
}

// Scratch-card cover painted in the palette's --accent; a visible button reveals without scratching.
export default function ScratchReveal({ onReveal, className, surfaceClassName, buttonClassName, hint, children }) {
  const canvasRef = useRef(null);
  const moves = useRef(0);
  const doneRef = useRef(false);
  const [done, setDone] = useState(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    onReveal?.();
  }, [onReveal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--accent").trim() || FALLBACK_COLOUR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function scratch(e) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    moves.current += 1;
    if (moves.current % CHECK_EVERY_MOVES === 0 && clearedRatio(ctx, canvas.width, canvas.height) >= REVEAL_AT) finish();
  }

  return (
    <div className={className}>
      <div className={surfaceClassName} style={{ position: "relative" }}>
        <div aria-hidden={!done}>{children}</div>
        {!done && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            onPointerDown={scratch}
            onPointerMove={(e) => (e.buttons || e.pointerType === "touch") && scratch(e)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
          />
        )}
      </div>
      {!done && (
        <button type="button" className={buttonClassName} onClick={finish}>
          {hint}
        </button>
      )}
    </div>
  );
}
