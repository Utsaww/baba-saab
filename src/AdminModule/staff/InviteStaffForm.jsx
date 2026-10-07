"use client";

import { useState } from "react";
import { OFFLINE_MESSAGE } from "./format";

const inputClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 px-3 text-sm";

export default function InviteStaffForm({ inviteAction }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const outcome = await inviteAction({
        email: String(data.get("email") ?? "").trim(),
        name: String(data.get("name") ?? "").trim(),
      });
      setResult(outcome);
      if (outcome.ok) form.reset();
    } catch {
      setResult({ ok: false, message: OFFLINE_MESSAGE });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm">
        Name
        <input name="name" required autoComplete="off" className={inputClass} />
      </label>
      <label className="text-sm">
        Email
        <input name="email" type="email" required autoComplete="off" className={inputClass} />
      </label>
      <button type="submit" disabled={busy} className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-60">
        {busy ? "Sending…" : "Send invitation"}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-sm sm:col-span-3 ${result.ok ? "text-green-700" : "text-red-700"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
