"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhoneFrame from "../PhoneFrame";
import { chipClass } from "../ui";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

export const READY_TIMEOUT_MS = 15_000;

const PREVIEW_LANGUAGES = [
  { id: null, label: "Both" },
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
];

export default function PreviewPane({ content, scale = 0.62 }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lang, setLang] = useState(null);
  const bilingual = content.language === "both";

  const post = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, content, lang: bilingual ? lang : null }, window.location.origin);
  }, [content, lang, bilingual]);
  const postRef = useRef(post);
  postRef.current = post;

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== READY_MESSAGE) return;
      setReady(true);
      setFailed(false);
      // The frame (re)loaded: send it the current draft straight away.
      postRef.current();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (ready) post();
  }, [ready, post]);

  useEffect(() => {
    if (ready) return undefined;
    const timer = setTimeout(() => setFailed(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <div className="flex flex-col items-center gap-3">
      {bilingual && (
        <div role="group" aria-label="Preview language" className="flex flex-wrap justify-center gap-2">
          {PREVIEW_LANGUAGES.map((option) => (
            <button key={option.label} type="button" aria-pressed={lang === option.id} onClick={() => setLang(option.id)} className={chipClass(lang === option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      )}
      {failed && (
        <p role="alert" className="rounded-xl border border-stone-300 bg-white p-4 text-sm text-stone-700">
          Preview unavailable — reload the page.
        </p>
      )}
      <PhoneFrame src="/admin/preview-frame" title="Live preview" scale={scale} iframeRef={frame} lazy={false} />
    </div>
  );
}
