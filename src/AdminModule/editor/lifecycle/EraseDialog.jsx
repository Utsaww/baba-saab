"use client";

import { useId, useState } from "react";

/** Typed confirmation for erasing at once: the link name, or "delete" when there is none. */
export default function EraseDialog({ slug, pending = false, onConfirm, onCancel }) {
  const id = useId();
  const word = slug ?? "delete";
  const [typed, setTyped] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (typed === word) onConfirm(typed);
  };

  return (
    <div role="dialog" aria-labelledby={`${id}-title`} className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <h2 id={`${id}-title`} className="font-semibold">
        Delete permanently now
      </h2>
      <p className="mt-2">
        This permanently erases the invitation, its photos, film and uploaded music, and frees its link name. Library songs are kept. Type{" "}
        <b>{word}</b> to confirm.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-3">
        <input
          aria-label="Confirmation"
          value={typed}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setTyped(e.target.value)}
          className="min-h-[44px] min-w-0 flex-1 rounded-md border border-red-300 bg-white px-3 text-sm text-stone-900"
        />
        <button type="submit" disabled={typed !== word || pending} className="min-h-[44px] rounded-full bg-red-800 px-5 text-sm text-white disabled:opacity-40">
          Erase now
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] px-2 text-sm underline">
          Cancel
        </button>
      </form>
    </div>
  );
}
