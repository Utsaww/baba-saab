const CENTRE = { ganesh: "श्री गणेशाय नमः", om: "ॐ" };
const PETAL_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);

// Original typographic emblem: a petal ring around the invocation word.
export default function Emblem({ deity, className }) {
  if (!CENTRE[deity]) return null;
  return (
    <svg className={className} viewBox="0 0 200 200" role="img" aria-label={deity === "om" ? "Om" : "Shri Ganeshaya Namah"}>
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="54" fill="none" stroke="currentColor" strokeWidth="1" />
      {PETAL_ANGLES.map((deg) => (
        <path
          key={deg}
          d="M100 10 C110 24 110 36 100 44 C90 36 90 24 100 10 Z"
          fill="currentColor"
          opacity="0.85"
          transform={`rotate(${deg} 100 100)`}
        />
      ))}
      <text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={deity === "om" ? 60 : 14}
        lang="hi"
        style={{ fontFamily: "var(--font-hindi), serif" }}
      >
        {CENTRE[deity]}
      </text>
    </svg>
  );
}
