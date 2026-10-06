"use client";

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path fill="currentColor" d="M16.5 12a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z" />
      )}
    </svg>
  );
}

export default function MuteButton({ playing, onToggle, className }) {
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      aria-label={playing ? "Pause music" : "Play music"}
      aria-pressed={playing}
    >
      <SpeakerIcon muted={!playing} />
    </button>
  );
}
