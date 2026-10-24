"use client";

import { useEffect, useState } from "react";
import LinkBox from "@/AdminModule/editor/publish/LinkBox";
import { familyMessage, familyUrl } from "@/AdminModule/editor/publish/links";
import { OFFLINE_MESSAGE } from "@/AdminModule/messages";

export const NEW_FAMILY_LINK_CONFIRM = "The old family link will stop working.";

const button = "inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100 disabled:opacity-40";

/** The family's private link with Copy / Send on WhatsApp, and New family link (which kills the old one). */
export default function FamilyLinkPanel({ slug, token, onNewLink }) {
  // Read after mount, like the editor's publish links, so server and client render the same first frame.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!slug) {
    return (
      <section aria-label="Family link" className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        Save a link name in the editor (step 8) to get the family link.
      </section>
    );
  }

  const makeNew = async () => {
    if (!window.confirm(NEW_FAMILY_LINK_CONFIRM)) return;
    setPending(true);
    setError("");
    try {
      const r = await onNewLink();
      if (!r?.ok) setError(r?.message ?? OFFLINE_MESSAGE);
    } catch {
      setError(OFFLINE_MESSAGE);
    } finally {
      setPending(false);
    }
  };

  const url = token && origin ? familyUrl(origin, slug, token) : null;
  return (
    <section aria-label="Family link" className="space-y-2">
      {url ? (
        <LinkBox label="Family link (shows guests' phone numbers — share only with the family)" url={url} message={familyMessage(url)} />
      ) : !token ? (
        <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">Make a family link to share the reply list with the family.</p>
      ) : null}
      <button type="button" onClick={makeNew} disabled={pending} className={button}>
        New family link
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
