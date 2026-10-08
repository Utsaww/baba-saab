"use client";

import { useState } from "react";
import PhoneFrame from "../PhoneFrame";
import { chipClass } from "../ui";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

// Next.js signals a server-action redirect with an error whose digest starts with NEXT_REDIRECT.
const isRedirect = (err) => typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");

export default function NewInvitationForm({ templates, createAction }) {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const template = templates.find((t) => t.id === templateId);
  const [palette, setPalette] = useState(template.palettes[0].id);
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function chooseTemplate(id) {
    setTemplateId(id);
    setPalette(templates.find((t) => t.id === id).palettes[0].id);
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await createAction({ templateId, palette, language });
      // On success the action redirects to the editor, so only a failure comes back here.
      if (result && !result.ok) {
        setError(result.message);
        setBusy(false);
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  const src = `/preview/template/${templateId}?palette=${encodeURIComponent(palette)}&lang=${language}`;

  return (
    <div className="mt-6 flex flex-col gap-8 lg:flex-row">
      <div className="flex flex-col gap-6 lg:w-96">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Design</legend>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === templateId}
                onClick={() => chooseTemplate(t.id)}
                className={`min-h-[44px] rounded-xl border p-3 text-left ${t.id === templateId ? "border-stone-900 bg-white" : "border-stone-200 bg-white hover:border-stone-400"}`}
              >
                <span className="block font-medium">{t.name}</span>
                <span className="block text-sm text-stone-600">{t.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Colour palette</legend>
          <div className="flex flex-wrap gap-2">
            {template.palettes.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === palette} onClick={() => setPalette(p.id)} className={chipClass(p.id === palette)}>
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
              <button key={l.id} type="button" aria-pressed={l.id === language} onClick={() => setLanguage(l.id)} className={chipClass(l.id === language)}>
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create invitation"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="text-xs text-stone-500">You can change the design, colours and language later without losing anything.</p>
      </div>
      <PhoneFrame src={src} title={`${template.name} preview`} scale={0.7} />
    </div>
  );
}
