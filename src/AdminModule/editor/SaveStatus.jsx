"use client";

import { statusLabel } from "./autosave";

const bannerButton = "min-h-[44px] rounded-full border border-current px-4 text-sm";

export default function SaveStatus({ state }) {
  return (
    <p aria-live="polite" className="text-sm text-stone-600">
      {statusLabel(state)}
    </p>
  );
}

export function SaveBanners({ state, onRetry, onReload }) {
  if (state.status === "conflict") {
    return (
      <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="flex-1">Updated by someone else — reload to see their changes. Your latest edits here were not saved.</span>
        <button type="button" onClick={onReload} className={bannerButton}>
          Reload
        </button>
      </div>
    );
  }
  if (state.error) {
    return (
      <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <span className="flex-1">Couldn&apos;t save — your changes are still here. {state.error}</span>
        <button type="button" onClick={onRetry} disabled={state.status === "saving"} className={bannerButton}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}
