"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { LIVE_BADGE, liveState } from "@/InvitationModule/lib/liveState";
import { filterInvitations, formatEdited, sortByRecent } from "./listing";

const BADGE_CLASSES = { live: "bg-green-100 text-green-900", changes: "bg-yellow-100 text-yellow-900" };

// Archived invitations keep their own label; the rest show whether guests see the latest version.
const badge = (row) => (row.status === "archived" ? "archived" : liveState(row));
const badgeLabel = (row) => (row.status === "archived" ? "Archived" : LIVE_BADGE[liveState(row)]);

const newButtonClass = "inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white";

export default function InvitationList({ rows, templateNames, now }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const shown = useMemo(() => sortByRecent(filterInvitations(rows, { q, status })), [rows, q, status]);

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
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
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
                <span className={`rounded-full px-2 text-xs ${BADGE_CLASSES[badge(row)] ?? "bg-stone-100"}`}>{badgeLabel(row)}</span>
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
