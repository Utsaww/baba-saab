"use client";

import { useEffect, useState } from "react";
import { accentPasses, isHex, suggestAccent } from "@/InvitationModule/lib/colors";
import { ChipGroup, TextInput } from "../fields";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

const swatch = (bg, accent) => `linear-gradient(135deg, ${bg} 50%, ${accent} 50%)`;

/** Hex code and colour picker kept in sync. Only a complete code reaches the draft, so the preview keeps the last valid colour. */
function ColourField({ label, value, onChange }) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => {
    if (value && value !== text.toLowerCase()) setText(value);
    // Only follow outside changes (picker, suggested colour); typing is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const write = (next) => {
    setText(next);
    if (isHex(next)) onChange(next.toLowerCase());
  };
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <TextInput label={label} value={text} onChange={write} error={isHex(text) ? undefined : "Use a colour code like #7B1E3A"} />
      </div>
      <input
        type="color"
        aria-label={`${label} colour picker`}
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => write(e.target.value)}
        className="h-11 w-11 cursor-pointer rounded-md border border-stone-300 bg-white"
      />
    </div>
  );
}

export default function TemplateStep({ content, update, templates }) {
  const current = templates.find((t) => t.id === content.templateId) ?? templates[0];
  const palette = content.theme?.palette;
  const colors = content.theme?.colors;
  const isCustom = palette === "custom" && current.customColours;
  const colorsValid = isHex(colors?.bg) && isHex(colors?.accent);

  function chooseTemplate(id) {
    const next = templates.find((t) => t.id === id);
    update(["templateId"], id);
    const keep = next.palettes.some((p) => p.id === palette) || (palette === "custom" && next.customColours);
    if (!keep) update(["theme", "palette"], next.palettes[0].id);
  }

  function choosePalette(id) {
    if (id === "custom" && !colorsValid) {
      const from = current.palettes.find((p) => p.id === palette) ?? current.palettes[0];
      update(["theme", "colors"], { bg: from.bg, accent: from.primary });
    }
    update(["theme", "palette"], id);
  }

  const paletteOptions = current.palettes.map((p) => ({ id: p.id, label: p.name, swatch: swatch(p.bg, p.primary) }));
  if (current.customColours) {
    paletteOptions.push({ id: "custom", label: "Custom", swatch: colorsValid ? swatch(colors.bg, colors.accent) : swatch("#e7e5e4", "#78716c") });
  }

  return (
    <div className="space-y-6">
      <ChipGroup legend="Design" options={templates.map((t) => ({ id: t.id, label: t.name }))} value={content.templateId} onChange={chooseTemplate} />
      <ChipGroup legend="Colour palette" options={paletteOptions} value={palette} onChange={choosePalette} />
      {isCustom && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ColourField label="Background" value={colors?.bg} onChange={(bg) => update(["theme", "colors"], (c) => ({ ...c, bg }))} />
            <ColourField label="Accent" value={colors?.accent} onChange={(accent) => update(["theme", "colors"], (c) => ({ ...c, accent }))} />
          </div>
          {colorsValid && !accentPasses(colors) && (
            <div role="alert" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>This accent is hard to read on this background. Invitations can&apos;t go live until it&apos;s fixed.</p>
              <button
                type="button"
                onClick={() => update(["theme", "colors"], (c) => ({ ...c, accent: suggestAccent(c) }))}
                className="min-h-[44px] rounded-md border border-amber-400 bg-white px-3 font-medium"
              >
                Use suggested colour
              </button>
            </div>
          )}
        </div>
      )}
      <ChipGroup legend="Language" options={LANGUAGE_OPTIONS} value={content.language ?? "en"} onChange={(id) => update(["language"], id)} />
      <p className="text-sm text-stone-500">
        Changing the design, colours or language never deletes anything you&apos;ve typed. Text in a language you switch off is
        kept, and comes back if you switch that language on again.
      </p>
    </div>
  );
}
