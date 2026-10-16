"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { isEraseDue, listNotices, STATUS_LABEL, statusBadge, todayIST } from "@/InvitationModule/lib/lifecycle";
import { filterInvitations, formatEdited, sortByRecent } from "./listing";

const DAY_MS = 86_400_000;

const BADGE_CLASSES = {
  live: "bg-green-100 text-green-900",
  changes: "bg-yellow-100 text-yellow-900",
  offline: "bg-stone-200 text-stone-800",
  deleted: "bg-red-100 text-red-900",
};

const FILTERS = [
  ["all", "All"],
  ["draft", "Draft"],
  ["published", "Live"],
  ["offline", "Offline"],
  ["deleted", "Deleted"],
];

// A deleted invitation says when it will be erased; once that moment has passed the job is still on it.
function badgeLabel(row, now) {
  const kind = statusBadge(row);
  if (kind !== "deleted") return STATUS_LABEL[kind];
  const at = Date.parse(row.purgeAt ?? "");
  if (!Number.isFinite(at)) return STATUS_LABEL.deleted;
  return `${STATUS_LABEL.deleted} · ${at <= now ? "erasing…" : `erased on ${formatDate(todayIST(at))}`}`;
}

const noticeClass = "min-h-[44px] rounded-xl border px-4 text-left text-sm hover:underline";

const newButtonClass = "inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white";

export default function InvitationList({ rows, templateNames, now }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const shown = useMemo(() => sortByRecent(filterInvitations(rows, { q, status })), [rows, q, status]);
  const notices = useMemo(() => listNotices(rows, now), [rows, now]);
  // The erase notice opens Deleted when any invitation it counts is deleted, otherwise Offline.
  const eraseFilter = useMemo(
    () => (rows.some((row) => row.status === "deleted" && isEraseDue(row, now + DAY_MS)) ? "deleted" : "offline"),
    [rows, now],
  );

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-stone-300 p-8 text-center">
        <p className="text-stone-600">No invitations yet.</p>
        <Link href="/admin/invitations/new" className={`mt-4 ${newButtonClass}`}>
          New invitation
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {notices.goingOffline > 0 || notices.erasingSoon > 0 ? (
        <div className="mb-4 flex flex-wrap gap-3">
          {notices.goingOffline > 0 ? (
            <button type="button" onClick={() => setStatus("published")} className={`${noticeClass} border-stone-300 bg-stone-50 text-stone-800`}>
              {notices.goingOffline === 1
                ? "1 invitation goes offline in the next 7 days"
                : `${notices.goingOffline} invitations go offline in the next 7 days`}
            </button>
          ) : null}
          {notices.erasingSoon > 0 ? (
            <button type="button" onClick={() => setStatus(eraseFilter)} className={`${noticeClass} border-red-200 bg-red-50 text-red-900`}>
              {`${notices.erasingSoon} will be erased in the next 24 hours`}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          aria-label="Search invitations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by couple name or phone"
          className="min-h-[44px] min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm"
        />
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-h-[44px] rounded-md border border-stone-300 bg-white px-3 text-sm"
        >
          {FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-stone-600">No invitations match your search.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {shown.map((row) => (
            <li key={row.id} className="flex items-center hover:bg-stone-50">
              <Link
                href={`/admin/invitations/${row.id}/edit`}
                className="flex min-h-[44px] min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <span className="min-w-0 flex-1 font-medium">{row.coupleNames}</span>
                <span className="text-sm text-stone-600">{templateNames[row.templateId] ?? row.templateId}</span>
                <span className="text-sm text-stone-600">{row.mainDate ? formatDate(row.mainDate) : "No date yet"}</span>
                <span className={`rounded-full px-2 text-xs ${BADGE_CLASSES[statusBadge(row)] ?? "bg-stone-100"}`}>{badgeLabel(row, now)}</span>
                <span className="w-full text-xs text-stone-500">
                  {`Edited ${formatEdited(row.updatedAt, now)}${row.updatedBy ? ` by ${row.updatedBy}` : ""}`}
                </span>
              </Link>
              {row.status === "published" && row.slug ? (
                <a
                  href={`/invitation/${row.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-4 inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100"
                >
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
