"use client";

import { useState } from "react";
import { formatAddedDate, OFFLINE_MESSAGE, statusLabel } from "./format";

const buttonClass = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-60";

function StaffRow({ member, isYou, inviteAction, removeAction, onResult }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = member.name || member.email;

  async function run(action) {
    setBusy(true);
    try {
      onResult(await action());
    } catch {
      onResult({ ok: false, message: OFFLINE_MESSAGE });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {label}
          {isYou && " (you)"}
        </p>
        {member.name && <p className="text-sm text-stone-600">{member.email}</p>}
        <p className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
          {member.isOwner && <span className="rounded-full bg-stone-900 px-2 text-white">Owner</span>}
          <span>{statusLabel(member.status)}</span>
          {member.createdAt && <span>Added {formatAddedDate(member.createdAt)}</span>}
        </p>
      </div>

      {member.status === "invited" && (
        <button type="button" disabled={busy} className={buttonClass} onClick={() => run(() => inviteAction({ email: member.email, name: member.name }))}>
          Send invite again
        </button>
      )}

      {!member.isOwner && !isYou &&
        (confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Remove {label}? They will no longer be able to sign in.</span>
            <button
              type="button"
              disabled={busy}
              className="min-h-[44px] rounded-full bg-red-700 px-4 text-sm text-white disabled:opacity-60"
              onClick={() => run(() => removeAction({ username: member.username }))}
            >
              Yes, remove
            </button>
            <button type="button" disabled={busy} className={buttonClass} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className={buttonClass} onClick={() => setConfirming(true)}>
            Remove
          </button>
        ))}
    </li>
  );
}

export default function StaffList({ members, currentUsername, inviteAction, removeAction }) {
  const [notice, setNotice] = useState(null);

  return (
    <div>
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`mt-3 text-sm ${notice.ok ? "text-green-700" : "text-red-700"}`}>
          {notice.message}
        </p>
      )}
      <ul className="divide-y divide-stone-200">
        {members.map((member) => (
          <StaffRow
            key={member.username}
            member={member}
            isYou={member.username === currentUsername}
            inviteAction={inviteAction}
            removeAction={removeAction}
            onResult={setNotice}
          />
        ))}
      </ul>
    </div>
  );
}
