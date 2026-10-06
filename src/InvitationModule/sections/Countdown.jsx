"use client";
import { useEffect, useState } from "react";
import { timeLeft } from "../lib/countdown";
import { UI } from "../lib/ui-strings";
import T from "./Text";

const UNITS = ["days", "hours", "minutes", "seconds"];

export default function Countdown({ target, lang, s = {} }) {
  // null until mounted so server and client HTML match.
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : timeLeft(target, now);
  if (left?.done) return <T as="p" v={UI.begun} lang={lang} className={s.countDone} />;

  return (
    <div className={s.countdown} role="timer" aria-live="off">
      {UNITS.map((unit) => (
        <div key={unit} className={s.countItem}>
          <span className={s.countNum}>{left ? String(left[unit]).padStart(2, "0") : "--"}</span>
          <T v={UI[unit]} lang={lang} className={s.countLabel} />
        </div>
      ))}
    </div>
  );
}
