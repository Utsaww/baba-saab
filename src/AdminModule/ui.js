// Pill-shaped toggle button used for palettes, languages and similar choices.
export const chipClass = (active) =>
  `flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm ${
    active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"
  }`;
