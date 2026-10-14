"use client";

import { useEffect, useState } from "react";

const CHECK_DELAY_MS = 400;

/** The link name staff choose. Checked for availability while they type; read-only once published. */
export default function SlugField({ value, onChange, saved, locked, onCheck, onSave }) {
  // { value, status, message } for the last name checked.
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = !locked && value !== "" && value !== saved;

  useEffect(() => {
    if (!editing) return undefined;
    let current = true;
    const timer = setTimeout(async () => {
      const result = await onCheck(value);
      if (current) setCheck({ value, ...result });
    }, CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [editing, value, onCheck]);

  const checked = editing && check?.value === value ? check : null;
  const save = async () => {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label htmlFor="slug" className="text-sm font-medium">
        Link name
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500">/invitation/</span>
        <input
          id="slug"
          value={value}
          readOnly={locked}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="min-h-[44px] min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm read-only:bg-stone-100"
        />
      </div>
      {locked ? <p className="mt-1 text-xs text-stone-500">Locked after publishing so links already shared keep working.</p> : null}
      {checked ? (
        <p className={`mt-1 text-xs ${checked.status === "available" ? "text-green-700" : "text-red-700"}`}>
          {checked.status === "available" ? "✓ available" : checked.message}
        </p>
      ) : null}
      {checked?.status === "available" ? (
        <button type="button" onClick={save} disabled={saving} className="mt-2 min-h-[44px] rounded-full border border-stone-300 px-5 text-sm disabled:opacity-40">
          Save link name
        </button>
      ) : null}
    </div>
  );
}
