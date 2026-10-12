"use client";

import { useId, useState } from "react";
import { INVOCATIONS } from "@/InvitationModule/lib/invocations";
import { hasText } from "@/InvitationModule/lib/i18n";
import { Group, LocalisedInput, TextInput } from "../fields";

const MAX_FAMILIES = 6;
const EMBLEMS = [
  { id: "ganesh", label: "Shri Ganesh" },
  { id: "om", label: "Om" },
  { id: "none", label: "None" },
];
const selectClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm";
const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100";

function shlokaChoice(invocation) {
  if (invocation?.presetId) return invocation.presetId;
  return hasText(invocation?.text) ? "custom" : "none";
}

export default function CoupleStep({ content, update, language }) {
  const [shloka, setShloka] = useState(() => shlokaChoice(content.invocation));
  const symbolId = useId();
  const shlokaId = useId();
  const families = content.hosts?.families ?? [];

  function chooseShloka(id) {
    setShloka(id);
    update(["invocation", "presetId"], id === "custom" || id === "none" ? undefined : id);
    if (id === "none") update(["invocation", "text"], undefined);
  }

  const person = (who, title, parentsHint) => (
    <Group title={title}>
      <LocalisedInput
        label={who === "bride" ? "Bride's name" : "Groom's name"}
        value={content.couple?.[who]?.name}
        language={language}
        onChange={(v) => update(["couple", who, "name"], v)}
      />
      <LocalisedInput
        label={who === "bride" ? "Bride's parents" : "Groom's parents"}
        hint={parentsHint}
        value={content.couple?.[who]?.parentsLine}
        language={language}
        onChange={(v) => update(["couple", who, "parentsLine"], v)}
      />
    </Group>
  );

  return (
    <div className="space-y-6">
      {person("bride", "Bride", 'For example "D/o Smt. Sunita & Shri Rajesh Sharma"')}
      {person("groom", "Groom", 'For example "S/o Smt. Kavita & Shri Anil Mehra"')}

      <Group title="Blessing at the top">
        <div>
          <label htmlFor={symbolId} className="text-sm font-medium">
            Symbol
          </label>
          <select id={symbolId} value={content.invocation?.deity ?? "ganesh"} onChange={(e) => update(["invocation", "deity"], e.target.value)} className={selectClass}>
            {EMBLEMS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={shlokaId} className="text-sm font-medium">
            Shloka
          </label>
          <select id={shlokaId} value={shloka} onChange={(e) => chooseShloka(e.target.value)} className={selectClass}>
            <option value="none">None</option>
            {INVOCATIONS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
            <option value="custom">Our own text</option>
          </select>
        </div>
        {shloka === "custom" && (
          <LocalisedInput label="Shloka text" multiline value={content.invocation?.text} language={language} onChange={(v) => update(["invocation", "text"], v)} />
        )}
      </Group>

      <Group title="Families and closing message">
        {families.map((family, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <LocalisedInput
                label={`Family ${i + 1}`}
                value={family}
                language={language}
                onChange={(v) => update(["hosts", "families"], families.map((f, j) => (j === i ? v : f)))}
              />
            </div>
            <button type="button" aria-label={`Remove family ${i + 1}`} onClick={() => update(["hosts", "families"], families.filter((_, j) => j !== i))} className={smallButton}>
              Remove
            </button>
          </div>
        ))}
        {families.length < MAX_FAMILIES && (
          <button type="button" onClick={() => update(["hosts", "families"], [...families, {}])} className={smallButton}>
            Add a family
          </button>
        )}
        <LocalisedInput
          label="Closing line"
          multiline
          hint='For example "With love and blessings from the Sharma and Mehra families"'
          value={content.hosts?.closingLine}
          language={language}
          onChange={(v) => update(["hosts", "closingLine"], v)}
        />
        <TextInput
          label="Family contact phone"
          type="tel"
          inputMode="tel"
          value={content.hosts?.contactPhone}
          hint="Shown to guests after RSVPs close. Also used to search for this invitation."
          onChange={(v) => update(["hosts", "contactPhone"], v || undefined)}
        />
      </Group>
    </div>
  );
}
