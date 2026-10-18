"use client";
import { useRef, useState } from "react";

export const ENVELOPE_MS = 900;

// Template CSS animates children via the [data-open="true"] attribute.
// onOpen fires at once (e.g. to start sparkles); onReveal after `delay` ms, once the animation has
// played. `delay` may be a function, read at the tap (e.g. shorter under reduced motion).
export default function EnvelopeReveal({ onReveal, onOpen, delay = ENVELOPE_MS, className, label, children }) {
  const [open, setOpen] = useState(false);
  const done = useRef(false);

  function handleClick() {
    if (done.current) return;
    done.current = true;
    setOpen(true);
    onOpen?.();
    setTimeout(() => onReveal?.(), typeof delay === "function" ? delay() : delay);
  }

  return (
    <button type="button" className={className} data-open={open} aria-label={label} onClick={handleClick}>
      {children}
    </button>
  );
}
