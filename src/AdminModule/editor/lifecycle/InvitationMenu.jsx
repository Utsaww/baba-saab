"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { addDays, PURGE_DAYS, todayIST } from "@/InvitationModule/lib/lifecycle";

export const TAKE_OFFLINE_CONFIRM = "Guests will see 'no longer available'. You can put it back online for 30 days.";
export const deleteConfirm = () => `It moves to Deleted and is erased on ${formatDate(addDays(todayIST(), PURGE_DAYS))} unless restored.`;

const item = "block min-h-[44px] w-full px-4 text-left text-sm hover:bg-stone-100 disabled:opacity-40";

/** The "⋯" menu: Take offline now (live invitations) and Delete (anything not already deleted). */
export default function InvitationMenu({ status, pending = false, onTakeOffline, onDelete }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (status === "deleted") return null;

  const choose = (message, action) => {
    setOpen(false);
    if (window.confirm(message)) action();
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] min-w-[44px] rounded-full border border-stone-300 px-3 text-lg leading-none hover:bg-stone-100"
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {status === "published" ? (
            <button type="button" disabled={pending} onClick={() => choose(TAKE_OFFLINE_CONFIRM, onTakeOffline)} className={item}>
              Take offline now
            </button>
          ) : null}
          <button type="button" disabled={pending} onClick={() => choose(deleteConfirm(), onDelete)} className={`${item} text-red-800`}>
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
