// Custom invitation colours: staff pick a background and an accent; everything else is derived to stay readable.

// Templates whose palette step offers Custom (the registry marks them `customColours`).
export const CUSTOM_COLOUR_TEMPLATES = ["royal", "floral", "minimal"];

const DARK = "#1d1d1f";
const LIGHT = "#f7f3ea";
const BODY = 4.5; // body text, and text on accent buttons
const ACCENT = 3; // headings, borders and buttons

export const isHex = (s) => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (channels) => `#${channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
const mix = (from, to, t) => {
  const b = rgb(to);
  return toHex(rgb(from).map((c, i) => c + (b[i] - c) * t));
};

// WCAG 2 relative luminance.
function luminance(hex) {
  return rgb(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const better = (on, a, b) => (contrastRatio(a, on) >= contrastRatio(b, on) ? a : b);
// Our soft dark/light first; on mid tones neither reaches 4.5, but pure black or white always does.
function readableOn(on, dark, light) {
  const pick = better(on, dark, light);
  return contrastRatio(pick, on) >= BODY ? pick : better(on, "#000000", "#ffffff");
}

function base(bg) {
  const text = readableOn(bg, DARK, LIGHT);
  const light = luminance(text) < luminance(bg);
  let surface = bg;
  for (const t of [0.06, 0.04, 0.02]) {
    const candidate = mix(bg, light ? "#ffffff" : text, t);
    if (contrastRatio(text, candidate) >= BODY) {
      surface = candidate;
      break;
    }
  }
  return { text, light, surface };
}

// The usual red, pulled toward the text colour until it reads on both bg and surface (text itself always does).
function readableError(red, text, bg, surface) {
  for (let t = 0; t < 1; t += 0.05) {
    const candidate = mix(red, text, t);
    if (contrastRatio(candidate, bg) >= BODY && contrastRatio(candidate, surface) >= BODY) return candidate;
  }
  return text;
}

export function customPaletteVars({ bg, accent }) {
  const { text, light, surface } = base(bg);
  let muted = text;
  for (let t = 0.5; t > 0; t -= 0.05) {
    const candidate = mix(text, bg, t);
    if (contrastRatio(candidate, bg) >= BODY && contrastRatio(candidate, surface) >= BODY) {
      muted = candidate;
      break;
    }
  }
  return {
    "--bg": bg,
    "--surface": surface,
    "--text": text,
    "--muted": muted,
    "--primary": accent,
    "--accent": accent,
    "--on-primary": readableOn(accent, DARK, "#ffffff"),
    "--error": readableError(light ? "#b42318" : "#ff8a80", text, bg, surface),
  };
}

export function accentPasses({ bg, accent }) {
  const { surface } = base(bg);
  return contrastRatio(accent, bg) >= ACCENT && contrastRatio(accent, surface) >= ACCENT;
}

export function toHsl(hex) {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function fromHsl([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return toHex([r, g, b].map((v) => (v + m) * 255));
}

/** The nearest accent that passes: same hue and saturation, lightness moved the least distance either way. */
export function suggestAccent({ bg, accent }) {
  const [h, s, l] = toHsl(accent);
  // Black or white is the worst case on the text's side, and always passes because body text already does.
  for (let d = 0; d <= 1; d += 0.01) {
    for (const next of [l - d, l + d]) {
      if (next < 0 || next > 1) continue;
      const candidate = fromHsl([h, s, next]);
      if (accentPasses({ bg, accent: candidate })) return candidate;
    }
  }
  return base(bg).light ? "#000000" : "#ffffff";
}
