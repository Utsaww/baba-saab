export type Timeline = { speed: number; hold: number; finalHold: number; targets: number[]; total: number };

const INTRO = 1.5 + 3;
const MIN_GLIDE = 0.4;
const MIN_TOTAL = 20;
const MAX_TOTAL = 60;
const FLOOR_HOLD = 0.8;

export function buildTimeline({ stops, end }: { stops: number[]; end: number }): Timeline {
  const uniq = [...new Set(stops.map((s) => Math.max(0, Math.round(s))))].sort((a, b) => a - b);
  const targets = [...uniq, end];

  const glides = (speed: number) => {
    let sum = 0;
    let prev = 0; // the page starts at the top
    for (const t of targets) {
      sum += Math.max(MIN_GLIDE, Math.abs(t - prev) / speed);
      prev = t;
    }
    return sum;
  };

  let speed = 250;
  let hold = 1.2;
  let finalHold = 2;
  const total = () => INTRO + glides(speed) + hold * (targets.length - 1) + finalHold;

  // Speed up first, until every glide is already at its minimum.
  while (total() > MAX_TOTAL && glides(speed) > targets.length * MIN_GLIDE + 1e-9) speed *= 1.1;
  // Then shrink holds. shortcut: if floor holds still overflow 60 s (~70+ stops) we return it as is.
  if (total() > MAX_TOTAL) {
    hold = Math.max(FLOOR_HOLD, (MAX_TOTAL - INTRO - glides(speed) - finalHold) / (targets.length - 1));
  }
  if (total() < MIN_TOTAL) finalHold += MIN_TOTAL - total();

  return { speed, hold, finalHold, targets, total: total() };
}
