"use client";

import { useEffect, useId, useState } from "react";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { todayIST } from "@/InvitationModule/lib/lifecycle";

/** Step ⑦: the date a live invitation goes offline by itself. */
export default function OfflineDateField({ value, onSave, pending = false, lastEventDate }) {
  const id = useId();
  const [date, setDate] = useState(value ?? "");
  // A date saved here (or elsewhere) becomes the field's value.
  useEffect(() => setDate(value ?? ""), [value]);
  const early = Boolean(date && lastEventDate && date < lastEventDate);

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Take offline on
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input
          id={id}
          type="date"
          min={todayIST()}
          value={date}
          aria-describedby={early ? `${id}-hint` : undefined}
          onChange={(e) => setDate(e.target.value)}
          className="block min-h-[44px] rounded-md border border-stone-300 bg-white px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => onSave(date)}
          disabled={pending || !date}
          className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-40"
        >
          Save date
        </button>
      </div>
      {early ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-amber-800">
          {`This is before the last event (${formatDate(lastEventDate)})`}
        </p>
      ) : null}
    </div>
  );
}
