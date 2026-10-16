"use client";

import { useId, useState } from "react";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { addDays, todayIST } from "@/InvitationModule/lib/lifecycle";

export const PICK_DATE = "Pick a date after today";

const button = "min-h-[44px] rounded-full border border-current px-4 text-sm disabled:opacity-40";

/** The India date of a stored moment, written out in full. */
const dayOf = (iso) => {
  const at = Date.parse(iso ?? "");
  return Number.isFinite(at) ? formatDate(todayIST(at)) : "";
};

/** Asks for the date the invitation goes offline by itself, which must be after today. */
function DatePrompt({ initial, submitLabel, error: given, pending, onSubmit, onCancel }) {
  const id = useId();
  const tomorrow = addDays(todayIST(), 1);
  const [date, setDate] = useState(initial && initial >= tomorrow ? initial : "");
  const [error, setError] = useState(null);
  const shown = error ?? given;

  const submit = async (event) => {
    event.preventDefault();
    if (!date || date < tomorrow) {
      setError(PICK_DATE);
      return;
    }
    setError(null);
    const r = await onSubmit(date);
    if (r?.message === PICK_DATE) setError(PICK_DATE);
  };

  return (
    <form noValidate onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor={id} className="block text-sm font-medium">
          Take offline on
        </label>
        <input
          id={id}
          type="date"
          min={tomorrow}
          value={date}
          aria-invalid={shown ? "true" : undefined}
          aria-describedby={shown ? `${id}-error` : undefined}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 block min-h-[44px] rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
        />
      </div>
      <button type="submit" disabled={pending} className={button}>
        {submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="min-h-[44px] px-2 text-sm underline">
        Cancel
      </button>
      {shown ? (
        <p id={`${id}-error`} className="w-full text-sm text-red-700">
          {shown}
        </p>
      ) : null}
    </form>
  );
}

/** Offline and deleted invitations say when they will be erased and how to bring them back. */
export default function LifecycleBanner({ status, offlineOn, offlineAt, purgeAt, pending = false, onPutOnline, onRestore, onEraseNow }) {
  // null, "online" (Put back online) or "restore" (Restore needs a new offline date).
  const [asking, setAsking] = useState(null);

  if (status !== "offline" && status !== "deleted") return null;

  const restore = async () => {
    const r = await onRestore(undefined);
    if (r?.message === PICK_DATE) setAsking("restore");
  };

  return (
    <div role="status" className="mt-4 rounded-xl border border-stone-300 bg-stone-100 p-4 text-sm text-stone-800">
      {status === "offline" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex-1">{`Offline since ${dayOf(offlineAt)} — will be erased on ${dayOf(purgeAt)}`}</span>
          {asking ? null : (
            <button type="button" onClick={() => setAsking("online")} disabled={pending} className={button}>
              Put back online
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex-1">{`Deleted — will be erased on ${dayOf(purgeAt)}`}</span>
          {asking ? null : (
            <button type="button" onClick={restore} disabled={pending} className={button}>
              Restore
            </button>
          )}
          <button type="button" onClick={onEraseNow} disabled={pending} className={`${button} text-red-800`}>
            Delete permanently now
          </button>
        </div>
      )}
      {asking ? (
        <DatePrompt
          key={asking}
          initial={offlineOn}
          submitLabel={asking === "online" ? "Put online" : "Restore with this date"}
          error={asking === "restore" ? PICK_DATE : null}
          pending={pending}
          onSubmit={asking === "online" ? onPutOnline : onRestore}
          onCancel={() => setAsking(null)}
        />
      ) : null}
    </div>
  );
}
