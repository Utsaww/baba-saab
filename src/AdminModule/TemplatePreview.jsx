"use client";
import Link from "next/link";
import { useState } from "react";
import PhoneFrame from "./PhoneFrame";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

const chip = (active) =>
  `flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm ${
    active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"
  }`;

export default function TemplatePreview({ templateId, name, description, palettes, defaultLanguage }) {
  const [palette, setPalette] = useState(palettes[0].id);
  const [language, setLanguage] = useState(defaultLanguage);
  const src = `/preview/template/${templateId}?palette=${encodeURIComponent(palette)}&lang=${language}`;

  return (
    <div>
      <Link href="/admin/templates" className="text-sm text-stone-600 hover:underline">
        ← All templates
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{name}</h1>
      <p className="text-stone-600">{description}</p>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col gap-6 lg:w-72">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Palette</legend>
            <div className="flex flex-wrap gap-2">
              {palettes.map((p) => (
                <button key={p.id} type="button" onClick={() => setPalette(p.id)} aria-pressed={palette === p.id} className={chip(palette === p.id)}>
                  <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.primary} 50%)` }} />
                  {p.name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Language</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <button key={l.id} type="button" onClick={() => setLanguage(l.id)} aria-pressed={language === l.id} className={chip(language === l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm underline">
            Open full screen ↗
          </a>
          <p className="text-xs text-stone-500">Sample details only. The opening animation replays each time you change a setting.</p>
        </div>
        <PhoneFrame src={src} title={`${name} preview`} scale={0.8} />
      </div>
    </div>
  );
}
