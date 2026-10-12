"use client";

import { cleanDraft } from "@/InvitationModule/schema/draft";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { Group } from "../fields";

export default function ReviewStep({ content, onGoToStep }) {
  const items = publishChecklist(cleanDraft(content).draft ?? {});
  return (
    <div className="space-y-6">
      {items.length > 0 ? (
        <Group title="Still needed before publishing">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-sm">{item.message}</span>
                <button
                  type="button"
                  onClick={() => onGoToStep(item.step)}
                  className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100"
                >
                  Go to step {item.step}
                </button>
              </li>
            ))}
          </ul>
        </Group>
      ) : (
        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Everything needed is filled in.</p>
      )}
      <div>
        <button type="button" disabled className="min-h-[44px] rounded-full bg-stone-900 px-6 text-sm text-white disabled:opacity-40">
          Publish
        </button>
        <p className="mt-2 text-xs text-stone-500">Publishing arrives in the next release. Your draft is saved automatically.</p>
      </div>
    </div>
  );
}
