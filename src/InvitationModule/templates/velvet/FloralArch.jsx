import st from "./velvet.module.scss";
import { round1, seeded } from "./seeded";

// Cubic Bézier vines for the left side of a 360 × 150 box; the right side mirrors them.
const VINES = {
  gold: [[14, 150], [6, 80], [92, 12], [180, 16]],
  sage: [[34, 150], [36, 98], [112, 34], [174, 27]],
};
const BLOSSOM_T = [0.2, 0.33, 0.46, 0.59, 0.72, 0.85];
const LEAF_T = [0.12, 0.26, 0.4, 0.53, 0.66, 0.79];
const SAGE_LEAF_T = [0.3, 0.62];
const SEED = 2027;

export const ARCH_BLOSSOMS = BLOSSOM_T.length * 2 + 3;
export const ARCH_LEAVES = (LEAF_T.length + SAGE_LEAF_T.length) * 2 + 4;

function point([p0, p1, p2, p3], t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}
function angle([p0, p1, p2, p3], t) {
  const u = 1 - t;
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}
const mirror = (curve) => curve.map(([x, y]) => [360 - x, y]);
const pathD = ([p0, p1, p2, p3]) => `M${p0} C${p1} ${p2} ${p3}`.replace(/,/g, " ");

function blossom(rand, x, y, r, side, i) {
  return { kind: "blossom", side, x: round1(x), y: round1(y), r: round1(r), turn: round1(rand() * 72), tone: i % 2 ? "ivory" : "gold" };
}
function leaf(rand, x, y, along, flip, scale) {
  return { kind: "leaf", x: round1(x), y: round1(y), turn: round1(along + (flip ? -1 : 1) * (40 + rand() * 25)), scale: round1(scale) };
}

// Everything is generated once from a fixed seed, so server and client markup are identical.
function build() {
  const rand = seeded(SEED);
  const leaves = [];
  const blossoms = [];
  for (const side of ["left", "right"]) {
    const gold = side === "left" ? VINES.gold : mirror(VINES.gold);
    const sage = side === "left" ? VINES.sage : mirror(VINES.sage);
    LEAF_T.forEach((t, i) => {
      const [x, y] = point(gold, t);
      leaves.push(leaf(rand, x, y, angle(gold, t) + 90, i % 2 === 0, 0.8 + rand() * 0.35));
    });
    SAGE_LEAF_T.forEach((t, i) => {
      const [x, y] = point(sage, t);
      leaves.push(leaf(rand, x, y, angle(sage, t) + 90, i % 2 === 1, 0.7 + rand() * 0.25));
    });
    BLOSSOM_T.forEach((t, i) => {
      const tt = t + (rand() - 0.5) * 0.04;
      const [x, y] = point(gold, tt);
      blossoms.push(blossom(rand, x + (rand() - 0.5) * 4, y + (rand() - 0.5) * 4, 4.4 + rand() * 2.2, side, i));
    });
  }
  // The crown: a larger bloom between two smaller ones, framed by four leaves.
  for (const [x, y, along, flip] of [[164, 22, 200, false], [196, 22, -20, true], [172, 12, 230, true], [188, 12, -50, false]]) {
    leaves.push(leaf(rand, x, y, along, flip, 0.95));
  }
  blossoms.push(blossom(rand, 166, 19, 5, "top", 1), blossom(rand, 194, 19, 5, "top", 1), blossom(rand, 180, 14, 7.2, "top", 0));
  return {
    vines: [
      { d: pathD(VINES.gold), tone: "gold" },
      { d: pathD(mirror(VINES.gold)), tone: "gold" },
      { d: pathD(VINES.sage), tone: "sage" },
      { d: pathD(mirror(VINES.sage)), tone: "sage" },
    ],
    leaves,
    blossoms,
  };
}
const ARCH = build();
const LEAF_D = "M0 0C3.4-3.6 3.4-8.4 0-12C-3.4-8.4-3.4-3.6 0 0Z";
const PETALS = [0, 72, 144, 216, 288];

export default function FloralArch({ className, label = "Floral arch" }) {
  return (
    <svg className={[st.arch, className].filter(Boolean).join(" ")} viewBox="0 0 360 150" role="img" aria-label={label}>
      {ARCH.vines.map((v, i) => (
        <path key={i} data-part="vine" d={v.d} className={v.tone === "gold" ? st.archVineGold : st.archVineSage} />
      ))}
      {ARCH.leaves.map((l, i) => (
        <path key={i} data-part="leaf" d={LEAF_D} className={st.archLeaf} transform={`translate(${l.x} ${l.y}) rotate(${l.turn}) scale(${l.scale})`} />
      ))}
      {ARCH.blossoms.map((b, i) => (
        <g key={i} data-part="blossom" data-side={b.side} transform={`translate(${b.x} ${b.y}) rotate(${b.turn})`}>
          {PETALS.map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy={round1(-b.r * 0.6)}
              rx={round1(b.r * 0.46)}
              ry={round1(b.r * 0.62)}
              transform={`rotate(${deg})`}
              className={b.tone === "gold" ? st.archPetalGold : st.archPetalIvory}
            />
          ))}
          <circle r={round1(b.r * 0.3)} className={st.archCentre} />
        </g>
      ))}
    </svg>
  );
}
