"use client";

import { UI } from "@/InvitationModule/lib/ui-strings";
import { ChipGroup, Group, LocalisedInput, Toggle } from "../fields";

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

// The schema's caps: past them the save drops the line, so the field stops the typing instead.
const MAX_LINE = 160;
const MAX_MESSAGE = 200;

const COUNTDOWN_MODES = [
  { id: "countdown", label: "Countdown" },
  { id: "message", label: "Message" },
];

const STYLE_ELEMENTS = [
  ["names", "Couple's names"],
  ["parents", "Parents' names"],
  ["intro", "Opening line"],
  ["headings", "Section headings"],
];
const SIZES = [
  { id: "sm", label: "Smaller" },
  { id: "md", label: "Normal" },
  { id: "lg", label: "Larger" },
  { id: "xl", label: "Largest" },
];

export default function WordingStep({ content, update, language, templates, onGoToStep }) {
  const keys = templates.find((t) => t.id === content.templateId)?.textKeys ?? [];
  const text = content.custom?.text;
  const countdown = content.custom?.countdown;
  const styles = content.custom?.styles;
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
                  maxLength={MAX_LINE}
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
      <Group title="Text size & style">
        {STYLE_ELEMENTS.map(([el, label]) => {
          const style = styles?.[el];
          // Normal size and switched-off toggles are the design's own, so they are stored as unset.
          const set = (key, value) => update(["custom", "styles", el, key], value || undefined);
          return (
            <fieldset key={el} className="space-y-2">
              <legend className="mb-2 text-sm font-semibold text-stone-700">{label}</legend>
              <ChipGroup legend="Size" options={SIZES} value={style?.size ?? "md"} onChange={(size) => set("size", size === "md" ? undefined : size)} />
              <div className="flex flex-wrap gap-x-6">
                <Toggle label="Bold" checked={style?.bold} onChange={(on) => set("bold", on)} />
                <Toggle label="Italic" checked={style?.italic} onChange={(on) => set("italic", on)} />
              </div>
            </fieldset>
          );
        })}
        <button type="button" onClick={() => update(["custom", "styles"], undefined)} className={smallButton}>
          Reset styles
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
          <LocalisedInput
            label="Message"
            value={countdown.message}
            language={language}
            maxLength={MAX_MESSAGE}
            onChange={(v) => update(["custom", "countdown", "message"], cleaned(v))}
          />
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
