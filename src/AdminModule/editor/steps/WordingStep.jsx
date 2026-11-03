"use client";

import { UI } from "@/InvitationModule/lib/ui-strings";
import { ChipGroup, Group, LocalisedInput } from "../fields";

const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100";

// Staff-facing names for each rewordable line, in the order they appear on the invitation.
const SECTIONS = [
  ["Opening", { tapToOpen: "Tap to open hint", scrollToOpen: "Scroll to open hint", scratchHint: "Scratch hint" }],
  [
    "Cover & couple",
    { weddingOf: "\"The wedding of\" line", blessing: "Blessing above the names", together: "Line above the couple's names", scrollCue: "Scroll cue" },
  ],
  [
    "Section headings",
    {
      saveTheDate: "Save the date heading",
      countdown: "Countdown heading",
      begun: "Message once the wedding has begun",
      venue: "Venue heading",
      sendRsvp: "RSVP button under the venue",
      travel: "Travel heading",
      schedule: "Events heading",
      foreverUs: "Line above the gallery heading",
      gallery: "Gallery heading",
      film: "Film heading",
      rsvp: "RSVP heading",
      rsvpBy: "Reply deadline line",
    },
  ],
  ["Closing", { closing: "Line above the closing message", warmRegards: "Line above the families" }],
];

const defaultHint = (key, language) => {
  const { en, hi } = UI[key];
  return `Template wording: ${language === "hi" ? hi : language === "both" ? `${en} / ${hi}` : en}`;
};

// Keeps only the languages with text; nothing left clears the override.
function cleaned(value) {
  const kept = Object.fromEntries(Object.entries(value).filter(([, text]) => text));
  return Object.keys(kept).length ? kept : undefined;
}

const COUNTDOWN_MODES = [
  { id: "countdown", label: "Countdown" },
  { id: "message", label: "Message" },
];

export default function WordingStep({ content, update, language, templates, onGoToStep }) {
  const keys = templates.find((t) => t.id === content.templateId)?.textKeys ?? [];
  const text = content.custom?.text;
  const countdown = content.custom?.countdown;
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Change the invitation&apos;s wording and text style. Everything here is optional; anything you leave alone uses the template&apos;s own wording.
      </p>
      <Group title="Wording">
        {SECTIONS.map(([title, labels]) => {
          const shown = Object.keys(labels).filter((key) => keys.includes(key));
          if (!shown.length) return null;
          return (
            <fieldset key={title} className="space-y-3">
              <legend className="mb-2 text-sm font-semibold text-stone-700">{title}</legend>
              {shown.map((key) => (
                <LocalisedInput
                  key={key}
                  label={labels[key]}
                  hint={defaultHint(key, language)}
                  value={text?.[key]}
                  language={language}
                  onChange={(v) => update(["custom", "text", key], cleaned(v))}
                />
              ))}
            </fieldset>
          );
        })}
        <button type="button" onClick={() => update(["custom", "text"], undefined)} className={smallButton}>
          Reset wording
        </button>
      </Group>
      <Group title="Countdown">
        <ChipGroup
          legend="Show"
          options={COUNTDOWN_MODES}
          value={countdown?.mode ?? "countdown"}
          onChange={(mode) => update(["custom", "countdown", "mode"], mode)}
          hint="Message replaces the days-and-hours countdown with a line of your own."
        />
        {countdown?.mode === "message" && (
          <LocalisedInput label="Message" value={countdown.message} language={language} onChange={(v) => update(["custom", "countdown", "message"], cleaned(v))} />
        )}
        <p className="text-sm text-stone-600">
          To hide the countdown completely, switch it off in{" "}
          <button type="button" onClick={() => onGoToStep(6)} className="underline">
            step 6 (Sections)
          </button>
          .
        </p>
      </Group>
    </div>
  );
}
