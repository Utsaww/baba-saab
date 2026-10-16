export const velvetFontVars = {
  "--font-display": "var(--font-greatvibes)",
  "--font-body": "var(--font-cormorant)",
};

// --bg is the invitation card, --surface the lifted band (event cards), --recessed the sunken band.
// --stage sits behind the card; --envelope/--envelope-shade/--fold paint the opening envelope.
// --primary is gold (headings, rules, seal) and --accent the bright gold for numerals.
export const velvetPalettes = [
  {
    id: "plum-gold",
    name: "Plum & Gold",
    vars: {
      "--bg": "#4E3670",
      "--surface": "#5B4182",
      "--recessed": "#452F64",
      "--text": "#E5DAEF",
      "--muted": "#BEAED2",
      "--ivory": "#FBF4E8",
      "--primary": "#E7C68C",
      "--accent": "#F2D8A6",
      "--rose": "#F2C3D9",
      "--on-primary": "#2B1D3E",
      "--stage": "#2B1D3E",
      "--envelope": "#6B4E96",
      "--envelope-shade": "#5A3F82",
      "--fold": "#48306A",
      "--error": "#FFB3BF",
    },
  },
  {
    id: "midnight-gold",
    name: "Midnight & Gold",
    vars: {
      "--bg": "#1C2742",
      "--surface": "#26335A",
      "--recessed": "#172038",
      "--text": "#DCE2F0",
      "--muted": "#A9B4CE",
      "--ivory": "#FBF4E8",
      "--primary": "#E3C285",
      "--accent": "#F2D8A6",
      "--rose": "#F0C4D2",
      "--on-primary": "#0E1424",
      "--stage": "#0E1424",
      "--envelope": "#33436E",
      "--envelope-shade": "#28375C",
      "--fold": "#18213A",
      "--error": "#FFB3BF",
    },
  },
  {
    id: "emerald-gold",
    name: "Emerald & Gold",
    vars: {
      "--bg": "#1E4A3C",
      "--surface": "#265A49",
      "--recessed": "#193F33",
      "--text": "#DDEBE3",
      "--muted": "#AFCABD",
      "--ivory": "#FBF4E8",
      "--primary": "#E7C68C",
      "--accent": "#F2D8A6",
      "--rose": "#F2C9C9",
      "--on-primary": "#0C2219",
      "--stage": "#0C2219",
      "--envelope": "#2E6A55",
      "--envelope-shade": "#245845",
      "--fold": "#173A2F",
      "--error": "#FFB3BF",
    },
  },
];
