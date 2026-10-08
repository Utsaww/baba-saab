"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { hasUnsavedChanges } from "./autosave";
import { setIn } from "./paths";
import SaveStatus, { SaveBanners } from "./SaveStatus";
import StepNav from "./StepNav";
import { guideHref, STEPS } from "./steps";
import { useAutosave } from "./useAutosave";
import { useLeaveGuard } from "./useLeaveGuard";

const navButton = "min-h-[44px] rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100";

export default function EditorShell({ invitation, initialStep, templates, saveAction }) {
  const [content, setContent] = useState(invitation.content);
  const [step, setStep] = useState(initialStep);

  const save = useCallback(
    ({ content: latest, expectedVersion }) => saveAction({ id: invitation.id, expectedVersion, content: latest }),
    [saveAction, invitation.id],
  );
  const { state, retry } = useAutosave({ content, initialVersion: invitation.version, save });
  const allowLeave = useLeaveGuard(hasUnsavedChanges(state));

  const update = useCallback((path, value) => setContent((c) => setIn(c, path, value)), []);
  const { errors } = useMemo(() => cleanDraft(content), [content]);

  const goTo = useCallback((n) => {
    setStep(n);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(n));
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const reload = () => {
    allowLeave();
    window.location.reload();
  };

  const current = STEPS[step - 1];
  const Step = current.Component;
  const title = indexFields(content).coupleNames;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/invitations" className="text-sm text-stone-600 hover:underline">
            ← All invitations
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        </div>
        <SaveStatus state={state} />
      </div>
      <SaveBanners state={state} onRetry={retry} onReload={reload} />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <StepNav current={step} content={content} onSelect={goTo} />
        </aside>

        <section className="min-w-0 flex-1" aria-labelledby="step-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="step-title" className="text-xl font-semibold">
              {current.number}. {current.title}
            </h2>
            <a href={guideHref(current)} target="_blank" rel="noopener noreferrer" className="text-sm underline">
              ? Help for this step
            </a>
          </div>
          <div className="mt-4">
            <Step content={content} update={update} errors={errors} language={content.language ?? "en"} templates={templates} onGoToStep={goTo} />
          </div>
          <div className="mt-8 flex justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => goTo(step - 1)} className={navButton}>
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length && (
              <button type="button" onClick={() => goTo(step + 1)} className={navButton}>
                Next →
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
