"use client";

import { useEffect, useState } from "react";
import ChangesNote from "./ChangesNote";
import LinkBox from "./LinkBox";
import PublishErrorNote from "./PublishErrorNote";
import SlugField from "./SlugField";
import { downloadQr, liveMessage, liveUrl, previewMessage, previewUrl } from "./links";

const button = "min-h-[44px] rounded-full px-5 text-sm";

export default function PublishPanel({ publishing, ready }) {
  const { live, state, busy, error, origin } = publishing;
  const [slug, setSlug] = useState(live.slug ?? "");
  const [running, setRunning] = useState(false);
  // A request started here, or one the editor is already running (e.g. from the header).
  const pending = running || Boolean(publishing.pending);
  const published = live.status === "published";

  // A link name saved elsewhere (claimed automatically, or saved from this field) becomes the field's value.
  useEffect(() => setSlug(live.slug ?? ""), [live.slug]);

  const run = async (fn) => {
    setRunning(true);
    try {
      await fn();
    } finally {
      setRunning(false);
    }
  };

  const publish = () => {
    if (!window.confirm("Publish? The link name can't be changed after this.")) return;
    run(() => publishing.onPublish(slug));
  };
  const newPreview = () => {
    if (!window.confirm("The old preview link will stop working.")) return;
    run(() => publishing.onNewPreviewLink());
  };

  return (
    <div className="space-y-6">
      <PublishErrorNote error={error} onGoToStep={publishing.onGoToStep} />

      <SlugField value={slug} onChange={setSlug} locked={published} saved={live.slug} onCheck={publishing.onCheckSlug} onSave={publishing.onSetSlug} />

      {live.slug && live.previewToken ? (
        <div className="space-y-2">
          <LinkBox label="Customer preview link" url={previewUrl(origin, live.slug, live.previewToken)} message={previewMessage(previewUrl(origin, live.slug, live.previewToken))} />
          <button type="button" onClick={newPreview} disabled={pending} className={`${button} border border-stone-300`}>
            New preview link
          </button>
        </div>
      ) : (
        <p className="text-sm text-stone-600">Save a link name to get the customer preview link.</p>
      )}

      {published ? (
        <div className="space-y-3">
          {state === "changes" ? <ChangesNote pending={pending} onUpdateLive={() => run(publishing.onUpdateLive)} /> : null}
          <LinkBox label="Live link for guests" url={liveUrl(origin, live.slug)} message={liveMessage(liveUrl(origin, live.slug))} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadQr({ url: liveUrl(origin, live.slug), slug: live.slug })} className={`${button} border border-stone-300`}>
              Download QR code
            </button>
            <a href={liveUrl(origin, live.slug)} target="_blank" rel="noopener noreferrer" className={`${button} inline-flex items-center border border-stone-300`}>
              Open
            </a>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" onClick={publish} disabled={!ready || busy || pending || !slug} className={`${button} bg-stone-900 text-white disabled:opacity-40`}>
            Publish
          </button>
          {busy ? <p className="mt-2 text-xs text-stone-500">Wait for uploads to finish</p> : null}
        </div>
      )}
    </div>
  );
}
