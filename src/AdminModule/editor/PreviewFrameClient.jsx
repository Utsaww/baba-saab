"use client";

import { Component, useEffect, useState } from "react";
import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import { previewInvitation } from "@/InvitationModule/lib/preview";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { getTemplate } from "@/InvitationModule/templates/registry";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

class PreviewBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p className="p-6 text-center text-sm text-stone-500">This preview can&apos;t be shown yet — keep editing.</p>;
    return this.props.children;
  }
}

/** Runs inside the editor's preview iframe: renders whatever draft the editor sends, exactly as guests would see it. */
export default function PreviewFrameClient() {
  const [message, setMessage] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const origin = window.location.origin;
    const onMessage = (event) => {
      if (event.source === window.parent && event.origin === origin && event.data?.type === PREVIEW_MESSAGE) {
        setMessage(event.data);
        setCount((n) => n + 1);
      }
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: READY_MESSAGE }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!message) return <p className="p-6 text-center text-sm text-stone-500">Loading preview…</p>;

  const draft = cleanDraft(message.content).draft;
  const template = draft && getTemplate(draft.templateId);
  if (!template) return <p className="p-6 text-center text-sm text-stone-500">Choose a design to see the preview.</p>;

  const { invitation, usedSample } = previewInvitation(draft, template);
  const shown = message.lang === "en" || message.lang === "hi" ? { ...invitation, language: message.lang } : invitation;
  return (
    <>
      {usedSample && (
        <p className="sticky top-0 z-50 bg-amber-100 px-3 py-2 text-center text-xs text-amber-900">
          Sample details shown where you haven&apos;t filled in yet
        </p>
      )}
      <PreviewBoundary key={count}>
        <InvitationRenderer invitation={shown} ctx={{ mode: "preview", skipOpening: true }} />
      </PreviewBoundary>
    </>
  );
}
