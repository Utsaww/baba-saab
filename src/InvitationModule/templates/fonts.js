import {
  Cinzel_Decorative,
  Cormorant_Garamond,
  Great_Vibes,
  Inter,
  Lora,
  Marcellus,
  Playfair_Display,
  Tiro_Devanagari_Hindi,
} from "next/font/google";

// preload:false — a font file downloads only when a template's CSS actually uses it.
const common = { display: "swap", preload: false };

const cinzel = Cinzel_Decorative({ ...common, subsets: ["latin"], weight: ["400", "700"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({ ...common, subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });
const greatVibes = Great_Vibes({ ...common, subsets: ["latin"], weight: "400", variable: "--font-greatvibes" });
const lora = Lora({ ...common, subsets: ["latin"], variable: "--font-lora" });
const marcellus = Marcellus({ ...common, subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const playfair = Playfair_Display({ ...common, subsets: ["latin"], variable: "--font-playfair" });
const inter = Inter({ ...common, subsets: ["latin"], variable: "--font-inter" });
const hindi = Tiro_Devanagari_Hindi({ ...common, subsets: ["devanagari", "latin"], weight: "400", variable: "--font-hindi" });

export const fontVariables = [cinzel, cormorant, greatVibes, lora, marcellus, playfair, inter, hindi]
  .map((f) => f.variable)
  .join(" ");
