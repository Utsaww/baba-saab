import { useId } from "react";
import { round1, seeded } from "./seeded";

const PETALS = [0, 72, 144, 216, 288];

// Positions for a cols × rows grid in a 134-wide box (100 tall for the whole envelope paper),
// each nudged off the grid and turned at random. Computed once per size and seed.
const layouts = new Map();
function layout(cols, rows, height, seed) {
  const key = `${cols}x${rows}x${height}:${seed}`;
  if (!layouts.has(key)) {
    const rand = seeded(seed);
    const cellW = 134 / cols;
    const cellH = height / rows;
    const items = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Alternate rows shift half a cell, like a printed paper pattern.
        const x = (c + 0.5 + (r % 2 ? 0.25 : -0.25)) * cellW + (rand() - 0.5) * cellW * 0.35;
        const y = (r + 0.5) * cellH + (rand() - 0.5) * cellH * 0.35;
        const turn = rand() * 72;
        const scale = 0.8 + rand() * 0.4;
        items.push(`translate(${round1(x)} ${round1(y)}) rotate(${round1(turn)}) scale(${round1(scale)})`);
      }
    }
    layouts.set(key, items);
  }
  return layouts.get(key);
}

// Faint embossed blossoms on the envelope paper. Decorative only.
export default function Emboss({ className, cols = 11, rows = 8, height = 100, seed = 11 }) {
  const id = `emboss${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} viewBox={`0 0 134 ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <symbol id={id} overflow="visible">
          {PETALS.map((deg) => (
            <ellipse key={deg} cx="0" cy="-1.5" rx="0.85" ry="1.5" transform={`rotate(${deg})`} />
          ))}
        </symbol>
      </defs>
      {layout(cols, rows, height, seed).map((transform, i) => (
        <use key={i} href={`#${id}`} data-part="blossom" transform={transform} />
      ))}
    </svg>
  );
}
