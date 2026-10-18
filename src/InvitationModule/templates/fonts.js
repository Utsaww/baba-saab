import {
  Cinzel_Decorative,
  Cormorant_Garamond,
  Great_Vibes,
  Inter,
  Italianno,
  Lora,
  Marcellus,
  Playfair_Display,
  Prata,
  Tenor_Sans,
  Tiro_Devanagari_Hindi,
} from "next/font/google";

// next/font only accepts literal option objects, so each call spells its options out.
// preload:false — a font file downloads only when a template's CSS actually uses it.
const cinzel = Cinzel_Decorative({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-cinzel", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant", display: "swap", preload: false });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-greatvibes", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const prata = Prata({ subsets: ["latin"], weight: "400", variable: "--font-prata", display: "swap", preload: false });
const italianno = Italianno({ subsets: ["latin"], weight: "400", variable: "--font-italianno", display: "swap", preload: false });
const tenor = Tenor_Sans({ subsets: ["latin"], weight: "400", variable: "--font-tenor", display: "swap", preload: false });
const hindi = Tiro_Devanagari_Hindi({ subsets: ["devanagari", "latin"], weight: "400", variable: "--font-hindi", display: "swap", preload: false });

export const fontVariables = [cinzel, cormorant, greatVibes, lora, marcellus, playfair, inter, prata, italianno, tenor, hindi]
  .map((f) => f.variable)
  .join(" ");
