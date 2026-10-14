"use client";

export default function ChangesNote({ onUpdateLive, pending = false }) {
  return (
    <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
      <span className="flex-1">You have changes guests can&apos;t see yet</span>
      <button type="button" onClick={onUpdateLive} disabled={pending} className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-40">
        Update live invitation
      </button>
    </div>
  );
}
