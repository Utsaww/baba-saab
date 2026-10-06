"use client";

export default function TapReveal({ onReveal, className, children }) {
  return (
    <button type="button" className={className} onClick={onReveal}>
      {children}
    </button>
  );
}
