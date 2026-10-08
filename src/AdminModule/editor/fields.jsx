"use client";

import { useId } from "react";
import { requiredLanguages } from "@/InvitationModule/lib/checklist";
import { chipClass } from "../ui";

export const FULL_LINK_HINT = "Use the full link, starting with https://";

const inputClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm aria-[invalid=true]:border-red-600";
const LANGUAGE_LABELS = { en: "English", hi: "हिंदी" };

export function Group({ title, children }) {
  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function TextInput({ label, value, onChange, error, hint, type = "text", multiline = false, lang, inputMode, placeholder }) {
  const id = useId();
  const note = error ?? hint;
  const Tag = multiline ? "textarea" : "input";
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Tag
        id={id}
        type={multiline ? undefined : type}
        rows={multiline ? 3 : undefined}
        value={value ?? ""}
        lang={lang}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {note && (
        <p id={`${id}-note`} className={`mt-1 text-xs ${error ? "text-red-700" : "text-stone-500"}`}>
          {note}
        </p>
      )}
    </div>
  );
}

/** One input per language the invitation uses. Text in a language that is switched off is kept. */
export function LocalisedInput({ label, value, onChange, language, multiline = false, hint }) {
  const langs = requiredLanguages(language);
  const both = langs.length > 1;
  return (
    <div className={both ? "grid gap-3 sm:grid-cols-2" : undefined}>
      {langs.map((lang) => (
        <TextInput
          key={lang}
          label={both ? `${label} (${LANGUAGE_LABELS[lang]})` : label}
          value={value?.[lang]}
          lang={lang}
          multiline={multiline}
          hint={hint}
          onChange={(text) => onChange({ ...value, [lang]: text })}
        />
      ))}
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex min-h-[44px] items-start gap-3">
      <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5" />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">{label}</span>
        {description && <span className="block text-stone-500">{description}</span>}
      </label>
    </div>
  );
}

export function ChipGroup({ legend, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.id} type="button" aria-pressed={option.id === value} onClick={() => onChange(option.id)} className={chipClass(option.id === value)}>
            {option.swatch && <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: option.swatch }} />}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
