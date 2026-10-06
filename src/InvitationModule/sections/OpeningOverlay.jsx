"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const CLOSE_MS = 700;

// Full-screen cover shown until the guest performs the template's reveal gesture.
export default function OpeningOverlay({ className, closingClassName, onOpen, label = "Invitation cover", children }) {
  const [phase, setPhase] = useState("shown");
  const opened = useRef(false);

  const open = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    setPhase("closing");
    onOpen?.();
    setTimeout(() => setPhase("gone"), CLOSE_MS);
  }, [onOpen]);

  useEffect(() => {
    if (phase === "gone") return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      className={[className, phase === "closing" && closingClassName].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children(open)}
    </div>
  );
}
