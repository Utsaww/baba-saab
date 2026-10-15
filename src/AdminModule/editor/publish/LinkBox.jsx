"use client";

import { useEffect, useRef, useState } from "react";
import { whatsappShareUrl } from "@/InvitationModule/lib/share";

const button = "inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100";

export default function LinkBox({ label, url, message }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 break-all text-sm text-stone-700">{url}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={copy} className={button}>
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer" className={button}>
          Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
