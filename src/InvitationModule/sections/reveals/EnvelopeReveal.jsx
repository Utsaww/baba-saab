"use client";
import { useRef, useState } from "react";

export const ENVELOPE_MS = 900;

// Template CSS animates children via the [data-open="true"] attribute.
export default function EnvelopeReveal({ onReveal, className, label, children }) {
  const [open, setOpen] = useState(false);
  const done = useRef(false);

  function handleClick() {
    if (done.current) return;
    done.current = true;
    setOpen(true);
    setTimeout(() => onReveal?.(), ENVELOPE_MS);
  }

  return (
    <button type="button" className={className} data-open={open} aria-label={label} onClick={handleClick}>
      {children}
    </button>
  );
}
