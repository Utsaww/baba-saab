import { istInstant } from "./datetime";

export function timeLeft(targetMs, nowMs) {
  const diff = Number.isFinite(targetMs) ? Math.max(0, targetMs - nowMs) : 0;
  const total = Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: diff === 0,
  };
}

// Earliest timed event on the main date, otherwise the start of that day.
export function countdownTarget(invitation) {
  const times = invitation.events
    .filter((e) => e.date === invitation.mainDate && e.time)
    .map((e) => e.time)
    .sort();
  return istInstant(invitation.mainDate, times[0]).getTime();
}
