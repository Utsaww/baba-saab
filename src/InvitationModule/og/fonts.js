import { readFile } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "src/InvitationModule/og/fonts");
let loaded;

/** Fonts for next/og: a Latin display face and a Devanagari face so Hindi names render. */
export function ogFonts() {
  loaded ??= Promise.all([
    readFile(path.join(dir, "playfair-display-latin-600-normal.woff")),
    readFile(path.join(dir, "noto-serif-devanagari-devanagari-600-normal.woff")),
  ]).then(([latin, deva]) => [
    { name: "Display", data: latin, weight: 600, style: "normal" },
    { name: "Devanagari", data: deva, weight: 600, style: "normal" },
  ]);
  return loaded;
}
