"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { mediaKeysToDelete } from "@/InvitationModule/lib/mediaKeys";
import { liveState } from "@/InvitationModule/lib/liveState";
import { generateSlug } from "@/InvitationModule/lib/slug";
import { deleteMedia } from "@/AdminModule/media/storage";
import { useUploads } from "@/AdminModule/media/useUploads";
import { PUBLISH_FAILED, SLUG_TAKEN } from "@/AdminModule/invitations/publishing";
import { OFFLINE_MESSAGE } from "@/AdminModule/messages";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { defaultOfflineOn, isIsoDate } from "@/InvitationModule/lib/lifecycle";
import { hasUnsavedChanges } from "./autosave";
import EraseDialog from "./lifecycle/EraseDialog";
import InvitationMenu from "./lifecycle/InvitationMenu";
import LifecycleBanner, { PICK_DATE } from "./lifecycle/LifecycleBanner";
import { getIn, setIn } from "./paths";
import PreviewPane from "./PreviewPane";
import ChangesNote from "./publish/ChangesNote";
import PublishErrorNote from "./publish/PublishErrorNote";
import SaveStatus, { SaveBanners } from "./SaveStatus";
import StepNav from "./StepNav";
import { guideHref, STEPS } from "./steps";
import { useAutosave } from "./useAutosave";
import { LEAVE_MESSAGE, UPLOADING_MESSAGE, useLeaveGuard } from "./useLeaveGuard";

const navButton = "min-h-[44px] rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100";
const LIFECYCLE_FAILED = "Couldn't save that change. Check your connection and try again.";
const LIFECYCLE_KEYS = ["status", "offlineOn", "offlineAt", "deletedAt", "purgeAt"];

/** The lifecycle fields after a staff change: `base` first (what the change implies), then what the server answered. */
function applyResult(l, r, base = {}) {
  const next = { ...l, ...base };
  for (const key of LIFECYCLE_KEYS) if (r[key] !== undefined) next[key] = r[key];
  return next;
}

/** The latest day of the wedding: the last dated event, or the wedding date. */
function lastEventDate(content) {
  const dates = [...(content?.events ?? []).map((e) => e?.date), content?.mainDate].filter(isIsoDate).sort();
  return dates.at(-1) ?? null;
}

export default function EditorShell({
  invitation,
  initialStep,
  templates,
  saveAction,
  publishActions = {},
  lifecycleActions = {},
  musicTracks = [],
  musicTracksError = false,
}) {
  const [content, setContent] = useState(invitation.content);
  const [step, setStep] = useState(initialStep);
  const [showPreview, setShowPreview] = useState(false);
  // Where the invitation is in its life and the dates that go with it. The only place `status` is kept.
  const [lifecycle, setLifecycle] = useState(() => ({
    status: invitation.status ?? "draft",
    offlineOn: invitation.offlineOn ?? null,
    offlineAt: invitation.offlineAt ?? null,
    deletedAt: invitation.deletedAt ?? null,
    purgeAt: invitation.purgeAt ?? null,
  }));
  // A deleted invitation can't be edited: nothing changes, so nothing is saved.
  const readOnly = lifecycle.status === "deleted";
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  // What guests can see: the link name, the preview code and the published copy (status comes from `lifecycle`).
  const [liveFields, setLive] = useState(() => ({
    slug: invitation.slug ?? null,
    previewToken: invitation.previewToken ?? null,
    liveVersion: invitation.liveVersion ?? null,
    publishedContent: invitation.publishedContent ?? null,
  }));
  const live = useMemo(() => ({ status: lifecycle.status, ...liveFields }), [lifecycle.status, liveFields]);
  const liveRef = useRef(live);
  liveRef.current = live;
  // A sentence, or { message, missing } when the server lists what is still needed.
  const [publishError, setPublishError] = useState(null);
  // Publish or Update live met a newer version: the conflict banner asks for a reload.
  const [publishConflict, setPublishConflict] = useState(false);
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
  // The copy a publish or Update live request is sending; it may become what guests see, so its files are kept.
  const sending = useRef(null);
  // Copies sent by a publish or Update live whose outcome is unknown (no answer, or the generic failure):
  // the server may have made one of them live, so their files are kept until the page reloads.
  const maybeLive = useRef([]);
  const onSaved = useCallback(
    (saved) => {
      const keep = [liveRef.current.publishedContent, sending.current, ...maybeLive.current];
      const removed = mediaKeysToDelete({ before: lastSaved.current, after: saved, keep, invitationId: invitation.id });
      lastSaved.current = saved;
      if (removed.length > 0) deleteMedia(removed);
    },
    [invitation.id],
  );
  const { state, retry, flushNow, settle } = useAutosave({ content, initialVersion: invitation.version, save, onSaved });
  const liveStatus = liveState({ status: live.status, version: state.version, liveVersion: live.liveVersion });

  // Server actions can get a new identity after a revalidation; always call the latest ones.
  const actionsRef = useRef(null);
  actionsRef.current = { ...publishActions, ...lifecycleActions };
  // A server action that never answers (dropped connection) rejects on the client; staff get a sentence instead.
  const call = async (name, args) => {
    try {
      return await actionsRef.current[name](args);
    } catch {
      return { ok: false, message: OFFLINE_MESSAGE };
    }
  };

  // One publish, Update live or new preview link at a time, shared by the header and the Review panel buttons.
  const [publishPending, setPublishPending] = useState(false);
  const pendingRef = useRef(false);
  const exclusive = async (fn) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPublishPending(true);
    try {
      await fn();
    } finally {
      pendingRef.current = false;
      setPublishPending(false);
    }
  };

  // Publishing works on the stored copy, so pending edits are saved first; the version and content that
  // save stored are what is sent and what guests will see. Returns them, or null after showing why not.
  const savedCopy = async () => {
    const result = await settle();
    if (result?.ok) return result;
    if (result?.conflict) setPublishConflict(true);
    else setPublishError("Couldn't save your latest changes. Try again.");
    return null;
  };

  const showFailure = (r) => {
    if (r?.conflict) setPublishConflict(true);
    else setPublishError({ message: r?.message ?? PUBLISH_FAILED, missing: r?.missing ?? [] });
  };

  // A refusal the server definitely made, so nothing went live: a conflict, missing details, or a known reason.
  // No answer at all, or the generic failure, means the request may still have committed.
  const definitelyRefused = (r) =>
    Boolean(r?.conflict || r?.missing?.length || (r?.message && r.message !== OFFLINE_MESSAGE && r.message !== PUBLISH_FAILED));

  // Runs a publish-type request for the stored copy. While it runs, saves keep that copy's files. When the
  // outcome is unknown the copy may be live, so it joins `maybeLive` and its files are kept until reload.
  const sendLive = async (name, args, onOk, onFail) => {
    setPublishError(null);
    const copy = await savedCopy();
    if (!copy) return;
    sending.current = copy.content;
    try {
      const r = await call(name, { id: invitation.id, expectedVersion: copy.version, ...args });
      if (r?.ok) {
        onOk(r, copy.content);
      } else {
        if (!definitelyRefused(r)) maybeLive.current = [...maybeLive.current, copy.content];
        showFailure(r);
        onFail?.(r);
      }
    } finally {
      sending.current = null;
    }
  };

  const onPublish = (slug) =>
    exclusive(() =>
      sendLive(
        "publishAction",
        { slug },
        (r, sent) => {
          liveRef.current = { ...liveRef.current, publishedContent: sent };
          setLive((l) => ({ ...l, slug: r.slug, liveVersion: r.liveVersion, publishedContent: sent }));
          // The server stored the default take-offline date for the copy it published (latest event + 7 days).
          setLifecycle((l) => ({ ...l, status: "published", offlineOn: defaultOfflineOn(sent) ?? l.offlineOn }));
        },
        // A new link name saved before publishing failed: the old one is released, so links must use the new one.
        (r) => {
          if (r?.slug) setLive((l) => ({ ...l, slug: r.slug }));
        },
      ),
    );

  const onUpdateLive = () =>
    exclusive(() =>
      sendLive("updateLiveAction", {}, (r, sent) => {
        // Files only the old live copy used can go now that guests see the new one — unless the current draft uses them.
        const removed = mediaKeysToDelete({ before: liveRef.current.publishedContent, after: sent, keep: [sent, lastSaved.current, ...maybeLive.current], invitationId: invitation.id });
        if (removed.length > 0) deleteMedia(removed);
        liveRef.current = { ...liveRef.current, publishedContent: sent };
        setLive((l) => ({ ...l, liveVersion: r.liveVersion, publishedContent: sent }));
      }),
    );

  const onSetSlug = async (slug) => {
    setPublishError(null);
    const r = await call("setSlugAction", { id: invitation.id, slug });
    if (r?.ok) setLive((l) => ({ ...l, slug: r.slug }));
    else setPublishError(r?.message ?? "Couldn't save the link name. Try again.");
    return r;
  };

  // Stable identity, so a revalidation doesn't restart the debounced check.
  const onCheckSlug = useCallback(async (slug) => {
    try {
      return await actionsRef.current.checkSlugAction({ id: invitation.id, slug });
    } catch {
      return { status: "error", message: OFFLINE_MESSAGE };
    }
  }, [invitation.id]);

  // A draft without a link name gets one from the couple's names the first time Review opens.
  const claimed = useRef(false);
  useEffect(() => {
    if (step !== 8 || live.status !== "draft" || live.slug || claimed.current || !actionsRef.current.setSlugAction) return;
    claimed.current = true;
    (async () => {
      let r = await call("setSlugAction", { id: invitation.id, slug: generateSlug(content) });
      if (!r?.ok && r?.message === SLUG_TAKEN) r = await call("setSlugAction", { id: invitation.id, slug: generateSlug(content) });
      if (r?.ok) setLive((l) => ({ ...l, slug: r.slug }));
      else setPublishError(r?.message ?? "Couldn't save the link name. Try again.");
    })();
    // Runs when Review opens; the content at that moment is what the name comes from, so content is not a dependency.
  },[step, live.status, live.slug, invitation.id]);

  const onNewPreviewLink = () =>
    exclusive(async () => {
      setPublishError(null);
      const r = await call("newPreviewLinkAction", { id: invitation.id });
      if (r?.ok) setLive((l) => ({ ...l, previewToken: r.previewToken }));
      else setPublishError(r?.message ?? "Couldn't make a new preview link. Try again.");
    });
  // Edits that are dirty, or saving with nothing queued, are saved by the autosave/unmount flush; the rest are at risk.
  const saveAtRisk = state.status === "error" || state.status === "conflict" || (state.status === "saving" && state.queued);
  const atRisk = uploads.busy || saveAtRisk;
  const allowLeave = useLeaveGuard({
    warnOnClose: uploads.busy || hasUnsavedChanges(state),
    atRisk,
    flushNow,
    message: uploads.busy && !saveAtRisk ? UPLOADING_MESSAGE : LEAVE_MESSAGE,
  });

  // Offline, delete, restore and erase. Each runs alone (shared with publishing), saves pending edits first so the
  // version sent is the stored one (a deleted invitation has none), and none of them changes the version.
  const [lifecycleError, setLifecycleError] = useState(null);
  const [erasing, setErasing] = useState(false);
  const runLifecycle = async (name, args, apply) => {
    let result;
    await exclusive(async () => {
      setLifecycleError(null);
      let expectedVersion = state.version;
      if (!readOnlyRef.current) {
        const copy = await savedCopy();
        if (!copy) return;
        expectedVersion = copy.version;
      }
      result = await call(name, { id: invitation.id, expectedVersion, ...args });
      if (result?.ok) {
        setLifecycle((l) => apply(l, result));
        setErasing(false);
      } else if (result?.conflict) setPublishConflict(true);
      // "Pick a date after today" is answered by the banner's date prompt.
      else if (result?.message !== PICK_DATE) setLifecycleError(result?.message ?? LIFECYCLE_FAILED);
    });
    return result;
  };

  const onTakeOffline = () => runLifecycle("takeOfflineAction", {}, (l, r) => applyResult(l, r));
  const onPutOnline = (offlineOn) =>
    runLifecycle("putOnlineAction", { offlineOn }, (l, r) => applyResult(l, r, { status: "published", offlineOn, offlineAt: null, purgeAt: null }));
  const onSetOfflineOn = (offlineOn) => runLifecycle("setOfflineOnAction", { offlineOn }, (l, r) => applyResult(l, r, { offlineOn }));
  const onDelete = () => runLifecycle("deleteInvitationAction", {}, (l, r) => applyResult(l, r, { status: "deleted" }));
  const onRestore = (offlineOn) =>
    runLifecycle("restoreInvitationAction", offlineOn ? { offlineOn } : {}, (l, r) =>
      applyResult(l, r, { deletedAt: null, purgeAt: null, ...(offlineOn ? { offlineOn } : {}) }),
    );
  const onErase = (confirm) =>
    exclusive(async () => {
      setLifecycleError(null);
      const r = await call("eraseNowAction", { id: invitation.id, confirm });
      if (r?.ok) {
        allowLeave();
        window.location.assign("/admin/invitations");
      } else if (r?.conflict) setPublishConflict(true);
      else setLifecycleError(r?.message ?? LIFECYCLE_FAILED);
    });

  const update = useCallback((path, value) => {
    if (readOnlyRef.current) return;
    setContent((c) => setIn(c, path, typeof value === "function" ? value(getIn(c, path)) : value));
  }, []);

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
        <div className="flex items-center gap-3">
          <SaveStatus state={state} />
          <InvitationMenu status={lifecycle.status} pending={publishPending} onTakeOffline={onTakeOffline} onDelete={onDelete} />
        </div>
      </div>
      <SaveBanners state={state} conflict={publishConflict} onRetry={retry} onReload={reload} />
      <LifecycleBanner
        key={lifecycle.status}
        {...lifecycle}
        pending={publishPending}
        onPutOnline={onPutOnline}
        onRestore={onRestore}
        onEraseNow={() => setErasing(true)}
      />
      {lifecycleError ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {lifecycleError}
        </p>
      ) : null}
      {erasing && readOnly ? <EraseDialog slug={live.slug} pending={publishPending} onConfirm={onErase} onCancel={() => setErasing(false)} /> : null}
      {step !== 8 ? <PublishErrorNote error={publishError} onGoToStep={goTo} className="mt-4" /> : null}
      {liveStatus === "changes" && step !== 8 && !readOnly ? <ChangesNote pending={publishPending} onUpdateLive={onUpdateLive} /> : null}

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
          <fieldset disabled={readOnly} className="mt-4 min-w-0">
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
                readOnly,
                error: publishError,
                pending: publishPending,
                origin,
                onSetSlug,
                onCheckSlug,
                onPublish,
                onUpdateLive,
                onNewPreviewLink,
                onGoToStep: goTo,
              }}
              offlineField={
                lifecycle.status === "published" || lifecycle.status === "offline"
                  ? { value: lifecycle.offlineOn, onSave: onSetOfflineOn, pending: publishPending, lastEventDate: lastEventDate(content) }
                  : null
              }
            />
          </fieldset>
          {readOnly ? null : (
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
          )}
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
