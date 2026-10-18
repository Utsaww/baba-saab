export const templeFontVars = {
  "--font-display": "var(--font-prata)",
  "--font-body": "var(--font-lora)",
  "--font-script": "var(--font-italianno)",
  "--font-label": "var(--font-tenor)",
};

// Light ivory paper with deep ink, one main accent and gold detailing. Ids stay as they were
// (they are stored on invitations); only the look and the names changed.
//   --bg paper, --band the tinted band behind Save the Date and RSVP, --surface lifted cards.
//   --primary the main accent (wine / sage / gold-brown); --primary-deep its darker shade.
//   --rose the soft second accent (decoration only); --rose-deep the "&" and other large accents.
//   --gold / --gold-soft frames, rules, the seal and the scratch foil (never body text).
//   --envelope / --envelope-deep paint the opening envelope; --petal / --petal-2 the falling petals.
export const templePalettes = [
  {
    id: "kumkum",
    name: "Wine & Rose",
    vars: {
      "--bg": "#FCF7F1",
      "--band": "#F6ECE3",
      "--surface": "#FFFDFA",
      "--text": "#3E2126",
      "--muted": "#7A5A5E",
      "--primary": "#8A3E46",
      "--primary-deep": "#5E2129",
      "--accent": "#C4A052",
      "--gold": "#C4A052",
      "--gold-soft": "#E2CE9A",
      "--rose": "#C4808A",
      "--rose-deep": "#A85563",
      "--line": "rgba(138, 62, 70, 0.18)",
      "--on-primary": "#FCF7F1",
      "--envelope": "#8A3E46",
      "--envelope-deep": "#5E2129",
      "--petal": "#C4808A",
      "--petal-2": "#D9BC78",
      "--error": "#A3242F",
    },
  },
  {
    id: "banana-leaf",
    name: "Sage & Gold",
    vars: {
      "--bg": "#FAF8F1",
      "--band": "#EEF0E4",
      "--surface": "#FFFEFA",
      "--text": "#24322A",
      "--muted": "#56645A",
      "--primary": "#4A6B4F",
      "--primary-deep": "#2E4734",
      "--accent": "#BFA055",
      "--gold": "#BFA055",
      "--gold-soft": "#E0D1A0",
      "--rose": "#9FB48F",
      "--rose-deep": "#5E7350",
      "--line": "rgba(74, 107, 79, 0.2)",
      "--on-primary": "#FAF8F1",
      "--envelope": "#2E4734",
      "--envelope-deep": "#1E3123",
      "--petal": "#A9BE98",
      "--petal-2": "#D8C07E",
      "--error": "#A3242F",
    },
  },
  {
    id: "temple-gold",
    name: "Ivory & Gold",
    vars: {
      "--bg": "#FCF8EF",
      "--band": "#F4EBDA",
      "--surface": "#FFFDF8",
      "--text": "#3A2A18",
      "--muted": "#6E5A44",
      "--primary": "#7F5A1E",
      "--primary-deep": "#553A10",
      "--accent": "#C4A052",
      "--gold": "#C4A052",
      "--gold-soft": "#E6D3A0",
      "--rose": "#D4B47C",
      "--rose-deep": "#85622A",
      "--line": "rgba(127, 90, 30, 0.2)",
      "--on-primary": "#FCF8EF",
      "--envelope": "#553A10",
      "--envelope-deep": "#3A2708",
      "--petal": "#D9BD84",
      "--petal-2": "#E9D9AE",
      "--error": "#A3242F",
    },
  },
];
