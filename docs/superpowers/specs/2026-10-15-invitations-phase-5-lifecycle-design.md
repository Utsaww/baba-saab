# Digital Invitations — Phase 5: Lifecycle (offline, delete, erase)

Parent spec: `docs/superpowers/specs/2026-10-06-digital-invitations-design.md` (approved). Builds on Phase 3 (`2026-10-13-invitations-phase-3-public-design.md`). This document settles Phase 5 decisions only; where it differs from the parent spec, this document wins.

## 1. Scope

**In:** automatic "take offline" after the wedding, manual take offline / put back online, delete with 30-day restore, automatic permanent erase 30 days after going offline or being deleted, "Delete permanently now", list statuses and filters, due-soon notices, a daily scheduled job, hiding the parked RSVP settings in editor step ⑦.

**Out:** the Thank-you page and archive photos (dropped by the owner), RSVPs and guest links (Phase 4, parked until a customer asks), the admin dashboard.

**Done means:** a published invitation goes offline by itself after the wedding and is erased (record, files, link name) 30 days later; staff can take it offline, bring it back, delete and restore it, or erase it at once; nothing in the shared Music Library is ever erased.

## 2. Decisions (agreed with the owner, 2026-10-15)

| # | Decision |
|---|---|
| D1 | After the wedding the link shows "This invitation is no longer available" (no Thank-you page). Replaces the parent spec's `archived` → Thank-you flow. |
| D2 | Each published invitation has a **Take offline on** date; default = latest event date (or `mainDate` if no events) + 7 days, IST. Staff can change it any time. |
| D3 | Offline or deleted invitations are **erased 30 days** later (record, own media, link name). Restore / put back online within those 30 days. |
| D4 | **Delete permanently now** is available to staff with a typed confirmation (the link name, or "delete" for drafts without one). |
| D5 | A **daily scheduled job** performs automatic take-offline and erase; failures retry the next day. |
| D6 | Editor step ⑦'s RSVP settings are hidden while RSVPs are parked; stored values are kept untouched. |

## 3. Statuses and data

Statuses become `draft | published | offline | deleted` (`archived` is removed from code; no stored invitation uses it).

`Invitation` gains (record fields, not draft content, so they never wait for "Update live"):

| Field | Meaning |
|---|---|
| `offlineOn` (date, nullable) | Day the job takes a published invitation offline. Set at publish to the default (D2). |
| `offlineAt` (datetime, nullable) | When it went offline. |
| `deletedAt` (datetime, nullable) | When it was deleted. |
| `statusBeforeDelete` (string, nullable) | `draft` / `published` / `offline`, used by Restore. |
| `purgeAt` (datetime, nullable) | When the job erases it. Set to `offlineAt + 30 d` or `deletedAt + 30 d`; cleared by put back online / restore. |

Visibility (extends Phase 3 §5): `offline` and `deleted` are never shown to guests. A valid preview token still shows the draft for `offline` (staff may show a customer before bringing it back); never for `deleted`.

## 4. Transitions

| From → To | Trigger | Effects |
|---|---|---|
| published → offline | job when `offlineOn ≤ today (IST)`, or staff **Take offline now** | `offlineAt = now`, `purgeAt = now + 30 d` |
| offline → published | staff **Put back online** | requires `offlineOn > today`; staff pick a new date first if not; clears `offlineAt`, `purgeAt` |
| any → deleted | staff **Delete** | `statusBeforeDelete = status`, `deletedAt = now`, `purgeAt = now + 30 d` |
| deleted → previous | staff **Restore** | status = `statusBeforeDelete`; clears `deletedAt`, `purgeAt`; restoring to `offline` sets a fresh `purgeAt = now + 30 d` |
| offline/deleted → erased | job when `purgeAt ≤ now`, or staff **Delete permanently now** | erase (§6) |
| (published) | staff change **Take offline on** | `offlineOn` updated; must be today or later |

Every staff transition is conditional on the invitation's current `version` and status (same conflict message as saving); none of them bumps `version`. The job's transitions are conditional on the status it read.

## 5. Backend

- New Lambda **`invitation-lifecycle`** (data stack). Handles staff mutations `takeInvitationOffline(id, expectedVersion)`, `putInvitationOnline(id, expectedVersion, offlineOn)`, `setInvitationOfflineOn(id, expectedVersion, offlineOn)`, `deleteInvitation(id, expectedVersion)`, `restoreInvitation(id, expectedVersion)`, `eraseInvitationNow(id, confirm)` (all `allow.group("admin")`, errors with typed names like Phase 3), **and** the scheduled run (`schedule` every day at 21:30 UTC = 03:00 IST).
- Permissions: read/write on `Invitation` and `InvitationSlug`; S3 `ListBucket` (prefix `invitations/*`) and `DeleteObject` on `invitations/*` only. No access to `music-library/*`.
- `publishInvitation` (Phase 3 Lambda) additionally sets `offlineOn` from an argument the server action computes from the approved content (D2).
- The daily run scans `Invitation` (hundreds of rows), applies take-offline then erase, and logs one summary line `lifecycle: offline=<n> erased=<n> failed=<n>` plus one line per failure with the invitation id.

## 6. Erase

Order, each step idempotent: (1) delete every object under `invitations/<id>/` (paged list + batch delete), (2) delete the `InvitationSlug` row if it still points at this invitation, (3) delete the `Invitation` row (conditional on status still `offline`/`deleted`). If any step fails, nothing later runs and the next day's run retries from the start. `eraseInvitationNow` runs the same routine immediately and requires `confirm` to equal the slug (or `"delete"` when there is none).

## 7. Staff screens

**Invitations list**
- Badges: Draft, Live, Changes not live, **Offline**, **Deleted** (red, "erased on <date>").
- Filter: All (everything except deleted), Draft, Live, Offline, Deleted.
- Notices above the list when relevant: "<n> invitation(s) go offline in the next 7 days" and "<n> will be erased in the next 24 hours", each linking to the filter.

**Editor**
- Live: **Take offline now** (confirm "Guests will see 'no longer available'. You can put it back online for 30 days."), and in step ⑦ a **Take offline on** date (hint when earlier than the last event).
- Offline: banner "Offline since <date> — will be erased on <date>" with **Put back online** (asks for a new date when needed). Editing and preview links still work.
- A small **⋯** menu on every invitation: **Delete** (confirm "It moves to Deleted and is erased on <date> unless restored.").
- Deleted: banner "Deleted — will be erased on <date>", **Restore**, **Delete permanently now** (typed confirmation). The editor is read-only; autosave is off.
- Step ⑦: RSVP settings hidden (D6).

## 8. Errors and edge cases

- Version conflict on any action → existing conflict banner with Reload.
- Job finds an invitation changed since it read it (condition fails) → skip, no error.
- Put back online with a past/today date → refused with "Pick a date after today".
- Erase step fails (S3/DynamoDB) → logged; invitation stays offline/deleted; retried next day; the list keeps showing "erased on <past date>" as "erasing…".
- Restore of an invitation whose link name was taken in the meantime cannot happen: a link name is only freed by erase.
- Offline invitations keep their link name until erased.

## 9. Testing

- **Unit:** default `offlineOn` (latest event / mainDate + 7 d, IST); `isDue` rules for offline and erase; every transition's preconditions and effects; erase order and idempotency (S3 paging, slug ownership check); list badge/filter/notice logic.
- **Component:** list badges, filters and notices; editor banners and buttons per status; confirm dialogs; typed confirmation; step ⑦ RSVP hidden.
- **Preview branch (manual):** invoke the scheduled function by hand against test invitations with past dates — they go offline, then (with `purgeAt` set in the past) are erased with their files and link name; library songs untouched.

## 10. Staff guide

`docs/admin-guide.md` gains: After the wedding (Take offline on), Taking an invitation offline / putting it back, Deleting and restoring, Permanent erase (what is erased, what is kept), and drops the RSVP settings description from step ⑦.
