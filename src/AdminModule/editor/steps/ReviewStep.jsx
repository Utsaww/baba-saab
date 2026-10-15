"use client";

import { cleanDraft } from "@/InvitationModule/schema/draft";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { Group } from "../fields";
import PublishPanel from "../publish/PublishPanel";

export default function ReviewStep({ content, onGoToStep, publishing }) {
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
      {publishing ? <PublishPanel publishing={publishing} ready={items.length === 0} /> : null}
    </div>
  );
}
