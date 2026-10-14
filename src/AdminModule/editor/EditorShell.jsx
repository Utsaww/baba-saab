"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { mediaKeysToDelete } from "@/InvitationModule/lib/mediaKeys";
import { liveState } from "@/InvitationModule/lib/liveState";
import { generateSlug } from "@/InvitationModule/lib/slug";
import { deleteMedia } from "@/AdminModule/media/storage";
import { useUploads } from "@/AdminModule/media/useUploads";
import { SLUG_TAKEN } from "@/AdminModule/invitations/publishing";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { hasUnsavedChanges } from "./autosave";
import { getIn, setIn } from "./paths";
import PreviewPane from "./PreviewPane";
import ChangesNote from "./publish/ChangesNote";
import SaveStatus, { SaveBanners } from "./SaveStatus";
import StepNav from "./StepNav";
import { guideHref, STEPS } from "./steps";
import { useAutosave } from "./useAutosave";
import { LEAVE_MESSAGE, UPLOADING_MESSAGE, useLeaveGuard } from "./useLeaveGuard";

const navButton = "min-h-[44px] rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100";

export default function EditorShell({
  invitation,
  initialStep,
  templates,
  saveAction,
  publishActions = {},
  musicTracks = [],
  musicTracksError = false,
}) {
  const [content, setContent] = useState(invitation.content);
  const [step, setStep] = useState(initialStep);
  const [showPreview, setShowPreview] = useState(false);
  // What guests can see: the link name, the preview code and the published copy.
  const [live, setLive] = useState(() => ({
    status: invitation.status ?? "draft",
    slug: invitation.slug ?? null,
    previewToken: invitation.previewToken ?? null,
    liveVersion: invitation.liveVersion ?? null,
    publishedContent: invitation.publishedContent ?? null,
  }));
  const liveRef = useRef(live);
  liveRef.current = live;
  const [publishError, setPublishError] = useState(null);
  // Set after mount so the server render and the first client render agree.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const save = useCallback(
    ({ content: latest, expectedVersion }) => saveAction({ id: invitation.id, expectedVersion, content: latest }),
    [saveAction, invitation.id],
  );
  const uploads = useUploads();
  // Files are deleted only after a save that no longer references them has succeeded,
  // and never while the live copy guests see still uses them (Update live deletes those).
  const lastSaved = useRef(invitation.content);
  const onSaved = useCallback(
    (saved) => {
      const removed = mediaKeysToDelete({ before: lastSaved.current, after: saved, keep: [liveRef.current.publishedContent], invitationId: invitation.id });
      lastSaved.current = saved;
      if (removed.length > 0) deleteMedia(removed);
    },
    [invitation.id],
  );
  const { state, retry, flushNow, settle } = useAutosave({ content, initialVersion: invitation.version, save, onSaved });
  const liveStatus = liveState({ status: live.status, version: state.version, liveVersion: live.liveVersion });

  // Publishing works on the stored copy, so pending edits are saved first and the version that save produced is sent.
  // Returns the version, or null after showing why it couldn't be saved.
  const savedVersion = useCallback(async () => {
    const result = await settle();
    if (result?.ok) return result.version;
    setPublishError(result?.conflict ? "Updated by someone else — reload the page." : "Couldn't save your latest changes. Try again.");
    return null;
  }, [settle]);

  const showFailure = (r) => {
    if (r?.conflict) setPublishError("Updated by someone else — reload the page.");
    else setPublishError([r?.message ?? "Couldn't publish. Check your connection and try again.", ...(r?.missing ?? [])].join(" "));
  };

  const onPublish = async (slug) => {
    setPublishError(null);
    const expectedVersion = await savedVersion();
    if (expectedVersion === null) return;
    const r = await publishActions.publishAction({ id: invitation.id, expectedVersion, slug });
    if (r?.ok) setLive((l) => ({ ...l, status: "published", slug: r.slug, liveVersion: r.liveVersion, publishedContent: lastSaved.current }));
    else showFailure(r);
  };

  const onUpdateLive = async () => {
    setPublishError(null);
    const expectedVersion = await savedVersion();
    if (expectedVersion === null) return;
    const r = await publishActions.updateLiveAction({ id: invitation.id, expectedVersion });
    if (!r?.ok) {
      showFailure(r);
      return;
    }
    const old = liveRef.current.publishedContent;
    const now = lastSaved.current;
    // Files only the old live copy still used can go now that guests see the new one.
    const removed = mediaKeysToDelete({ before: old, after: now, keep: [now], invitationId: invitation.id });
    if (removed.length > 0) deleteMedia(removed);
    setLive((l) => ({ ...l, liveVersion: r.liveVersion, publishedContent: now }));
  };

  const onSetSlug = async (slug) => {
    setPublishError(null);
    const r = await publishActions.setSlugAction({ id: invitation.id, slug });
    if (r?.ok) setLive((l) => ({ ...l, slug: r.slug }));
    else setPublishError(r?.message ?? "Couldn't save the link name. Try again.");
    return r;
  };

  // Server actions can get a new identity after a revalidation; the slug check must not restart because of it.
  const actionsRef = useRef(publishActions);
  actionsRef.current = publishActions;
  const onCheckSlug = useCallback((slug) => actionsRef.current.checkSlugAction({ id: invitation.id, slug }), [invitation.id]);

  // A draft without a link name gets one from the couple's names the first time Review opens.
  const claimed = useRef(false);
  useEffect(() => {
    if (step !== 8 || live.status !== "draft" || live.slug || claimed.current || !actionsRef.current.setSlugAction) return;
    claimed.current = true;
    (async () => {
      let r = await actionsRef.current.setSlugAction({ id: invitation.id, slug: generateSlug(content) });
      if (!r?.ok && r?.message === SLUG_TAKEN) r = await actionsRef.current.setSlugAction({ id: invitation.id, slug: generateSlug(content) });
      if (r?.ok) setLive((l) => ({ ...l, slug: r.slug }));
      else setPublishError(r?.message ?? "Couldn't save the link name. Try again.");
    })();
    // Runs when Review opens; the content at that moment is what the name comes from, so content is not a dependency.
  },[step, live.status, live.slug, invitation.id]);

  const onNewPreviewLink = async () => {
    setPublishError(null);
    const r = await publishActions.newPreviewLinkAction({ id: invitation.id });
    if (r?.ok) setLive((l) => ({ ...l, previewToken: r.previewToken }));
    else setPublishError(r?.message ?? "Couldn't make a new preview link. Try again.");
  };
  // Edits that are dirty, or saving with nothing queued, are saved by the autosave/unmount flush; the rest are at risk.
  const saveAtRisk = state.status === "error" || state.status === "conflict" || (state.status === "saving" && state.queued);
  const atRisk = uploads.busy || saveAtRisk;
  const allowLeave = useLeaveGuard({
    warnOnClose: uploads.busy || hasUnsavedChanges(state),
    atRisk,
    flushNow,
    message: uploads.busy && !saveAtRisk ? UPLOADING_MESSAGE : LEAVE_MESSAGE,
  });

  const update = useCallback(
    (path, value) => setContent((c) => setIn(c, path, typeof value === "function" ? value(getIn(c, path)) : value)),
    [],
  );

  const { errors } = useMemo(() => cleanDraft(content), [content]);

  const goTo = useCallback((n) => {
    setStep(n);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(n));
    window.history.replaceState(null, "", url);
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById("step-title")?.focus();
  }, [step]);

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
          <Link href="/admin/invitations" className="inline-flex min-h-[44px] items-center text-sm text-stone-600 hover:underline">
            ← All invitations
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        </div>
        <button
          type="button"
          aria-expanded={showPreview}
          aria-controls="live-preview"
          onClick={() => setShowPreview((v) => !v)}
          className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm lg:hidden"
        >
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <SaveStatus state={state} />
      </div>
      <SaveBanners state={state} onRetry={retry} onReload={reload} />
      {liveStatus === "changes" && step !== 8 ? <ChangesNote onUpdateLive={onUpdateLive} /> : null}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <StepNav current={step} content={content} onSelect={goTo} />
        </aside>

        <section className="min-w-0 flex-1" aria-labelledby="step-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="step-title" tabIndex={-1} className="text-xl font-semibold outline-none">
              {current.number}. {current.title}
            </h2>
            <a href={guideHref(current)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-sm underline">
              ? Help for this step
            </a>
          </div>
          <div className="mt-4">
            <Step
              content={content}
              update={update}
              errors={errors}
              language={content.language ?? "en"}
              templates={templates}
              onGoToStep={goTo}
              invitationId={invitation.id}
              musicTracks={musicTracks}
              musicTracksError={musicTracksError}
              uploads={uploads}
              publishing={{
                live,
                state: liveStatus,
                busy: uploads.busy,
                error: publishError,
                origin,
                onSetSlug,
                onCheckSlug,
                onPublish,
                onUpdateLive,
                onNewPreviewLink,
              }}
            />
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

        <aside id="live-preview" aria-label="Live preview" className={`${showPreview ? "block" : "hidden"} order-first lg:order-none lg:block lg:w-[262px] lg:shrink-0`}>
          <div className="lg:sticky lg:top-4">
            <PreviewPane content={content} />
          </div>
        </aside>
      </div>
    </div>
  );
}
