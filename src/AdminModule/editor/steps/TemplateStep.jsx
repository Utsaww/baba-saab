"use client";

import { ChipGroup } from "../fields";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

export default function TemplateStep({ content, update, templates }) {
  const current = templates.find((t) => t.id === content.templateId) ?? templates[0];

  function chooseTemplate(id) {
    const next = templates.find((t) => t.id === id);
    update(["templateId"], id);
    if (!next.palettes.some((p) => p.id === content.theme?.palette)) update(["theme", "palette"], next.palettes[0].id);
  }

  return (
    <div className="space-y-6">
      <ChipGroup legend="Design" options={templates.map((t) => ({ id: t.id, label: t.name }))} value={content.templateId} onChange={chooseTemplate} />
      <ChipGroup
        legend="Colour palette"
        options={current.palettes.map((p) => ({ id: p.id, label: p.name, swatch: `linear-gradient(135deg, ${p.bg} 50%, ${p.primary} 50%)` }))}
        value={content.theme?.palette}
        onChange={(id) => update(["theme", "palette"], id)}
      />
      <ChipGroup legend="Language" options={LANGUAGE_OPTIONS} value={content.language ?? "en"} onChange={(id) => update(["language"], id)} />
      <p className="text-sm text-stone-500">
        Changing the design, colours or language never deletes anything you&apos;ve typed. Text in a language you switch off is
        kept, and comes back if you switch that language on again.
      </p>
    </div>
  );
}
