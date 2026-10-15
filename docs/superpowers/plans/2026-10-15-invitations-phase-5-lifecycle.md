# Digital Invitations — Phase 5: Lifecycle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Published invitations go offline by themselves after the wedding and are erased 30 days later; staff can take offline, put back online, delete, restore and erase now.

**Architecture:** `Invitation` gains `offlineOn`, `offlineAt`, `deletedAt`, `statusBeforeDelete`, `purgeAt`; statuses become `draft | published | offline | deleted`. One new Lambda, `invitation-lifecycle` (data stack), serves six staff mutations and a daily EventBridge schedule (21:30 UTC = 03:00 IST). It reads and writes the two invitation tables and may only list/delete S3 objects under `invitations/*`. Publish (Phase 3 Lambda) also stores `offlineOn`, computed by the Next server action from the approved draft. The editor and list show the new states; a deleted invitation's editor is read-only.

**Tech Stack:** Next.js 14.2 (JS in `src/`, alias `@/*`), Tailwind, Vitest 2 + Testing Library (jsdom; user-event v14); Amplify Gen 2 (`amplify/`, TypeScript, `defineFunction` with `schedule`), `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `aws-cdk-lib`.

**Spec:** `docs/superpowers/specs/2026-10-15-invitations-phase-5-lifecycle-design.md` (binding), extends Phase 3 and the parent spec.

## Global Constraints

- Never commit to `main`; work on `feature/invitations-phase-5`. Never stage `amplify_outputs.json`.
- Statuses: `draft | published | offline | deleted`. `archived` is removed everywhere.
- Default Take offline on = latest event `date` (or `mainDate` when there are no dated events) + 7 days, as an ISO date (`YYYY-MM-DD`) in IST.
- Offline is due when `status = published` and `offlineOn ≤ today (IST)`. Erase is due when `status ∈ {offline, deleted}` and `purgeAt ≤ now`.
- `purgeAt` = the moment the invitation went offline or was deleted + 30 days (`PURGE_DAYS = 30`).
- Staff transitions are conditional on `version` and status, and never bump `version`. Conflicts use errorType `VersionConflict`.
- Erase order: (1) S3 objects under `invitations/<id>/`, (2) `InvitationSlug` row only if `invitationId = id`, (3) `Invitation` row conditional on status `offline`/`deleted`. Never touch `music-library/*`.
- Typed confirmation for erase now: the slug, or `delete` when there is no slug.
- Copy (exact):
  - Take offline confirm: `Guests will see 'no longer available'. You can put it back online for 30 days.`
  - Delete confirm: `It moves to Deleted and is erased on <date> unless restored.`
  - Offline banner: `Offline since <date> — will be erased on <date>`
  - Deleted banner: `Deleted — will be erased on <date>`
  - Badges: `Draft`, `Live`, `Changes not live`, `Offline`, `Deleted`
  - Notices: `<n> invitation(s) go offline in the next 7 days`, `<n> will be erased in the next 24 hours`
  - Put back online with a non-future date: `Pick a date after today`
- Job log summary line: `lifecycle: offline=<n> erased=<n> failed=<n>`.
- After any dependency change: `npm install --package-lock-only`, then verify a clean `npm ci` in a scratch copy.

## Review Focus

1. **Erasing the wrong files.** The S3 prefix must be exactly `invitations/<id>/` with a non-empty, validated id; never the bucket root or `music-library/` (Task 2 tests).
2. **The job undoing staff actions.** A staff Put back online / Restore between the job's read and write must win; the job's writes are conditional on the status it read (Task 2 tests).
3. **India time at midnight.** At 00:30 IST the IST date is already tomorrow while UTC is still today; offline must use the IST date (Task 1 tests).
4. **Restoring into a live link.** Restore of a published invitation must make the link live again immediately and clear `purgeAt` (Task 2 + Task 4 tests).
5. **Editing a deleted invitation.** Autosave must not run and fields must be disabled when deleted (Task 4 test).

---

### Task 1: Pure lifecycle rules

**Files:**
- Create: `src/InvitationModule/lib/lifecycle.js`, `src/InvitationModule/lib/lifecycle.test.js`
- Modify: `src/InvitationModule/schema/invitation.js` (STATUSES), `src/AdminModule/invitations/listing.js` (+ test)

**Interfaces:**
- Produces: `PURGE_DAYS = 30`, `OFFLINE_AFTER_DAYS = 7`, `todayIST(now = Date.now()) → "YYYY-MM-DD"`, `addDays(isoDate, n) → "YYYY-MM-DD"`, `defaultOfflineOn(content) → "YYYY-MM-DD" | null`, `isOfflineDue(row, now)`, `isEraseDue(row, now)`, `statusBadge(row) → "draft" | "live" | "changes" | "offline" | "deleted"`, `STATUS_LABEL`, `listNotices(rows, now) → { goingOffline: number, erasingSoon: number }`.
- `filterInvitations(rows, { q, status })`: `status = "all"` now excludes `deleted`; statuses `draft`, `published`, `offline`, `deleted` filter exactly.

- [ ] **Step 1: Write the failing tests** — `src/InvitationModule/lib/lifecycle.test.js`:
```js
import { describe, expect, it } from "vitest";
import {
  addDays, defaultOfflineOn, isEraseDue, isOfflineDue, listNotices, PURGE_DAYS, STATUS_LABEL, statusBadge, todayIST,
} from "./lifecycle";

const at = (iso) => Date.parse(iso);

describe("todayIST", () => {
  it("is already tomorrow at 00:30 IST while UTC is still today", () => {
    expect(todayIST(at("2027-02-13T19:00:00Z"))).toBe("2027-02-14");
    expect(todayIST(at("2027-02-13T18:00:00Z"))).toBe("2027-02-13");
  });
});

describe("addDays", () => {
  it("crosses months and years", () => {
    expect(addDays("2027-02-25", 7)).toBe("2027-03-04");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("defaultOfflineOn", () => {
  it("is the latest event date + 7", () => {
    const content = { mainDate: "2027-02-14", events: [{ date: "2027-02-12" }, { date: "2027-02-15" }, { date: "" }] };
    expect(defaultOfflineOn(content)).toBe("2027-02-22");
  });
  it("falls back to the wedding date", () => {
    expect(defaultOfflineOn({ mainDate: "2027-02-14", events: [] })).toBe("2027-02-21");
  });
  it("is null without any date", () => expect(defaultOfflineOn({})).toBeNull());
});

describe("isOfflineDue", () => {
  const now = at("2027-02-22T00:00:00Z"); // 05:30 IST on 22 Feb
  it("is due on the day itself and after", () => {
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-22" }, now)).toBe(true);
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-21" }, now)).toBe(true);
  });
  it("is not due before, without a date, or when not published", () => {
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-23" }, now)).toBe(false);
    expect(isOfflineDue({ status: "published", offlineOn: null }, now)).toBe(false);
    expect(isOfflineDue({ status: "draft", offlineOn: "2027-01-01" }, now)).toBe(false);
  });
});

describe("isEraseDue", () => {
  const now = at("2027-03-30T10:00:00Z");
  it("is due for offline or deleted rows past purgeAt", () => {
    expect(isEraseDue({ status: "offline", purgeAt: "2027-03-30T09:59:59Z" }, now)).toBe(true);
    expect(isEraseDue({ status: "deleted", purgeAt: "2027-03-30T10:00:00Z" }, now)).toBe(true);
  });
  it("is never due for live or draft rows, or before purgeAt", () => {
    expect(isEraseDue({ status: "published", purgeAt: "2027-01-01T00:00:00Z" }, now)).toBe(false);
    expect(isEraseDue({ status: "offline", purgeAt: "2027-03-31T00:00:00Z" }, now)).toBe(false);
    expect(isEraseDue({ status: "offline", purgeAt: null }, now)).toBe(false);
  });
  it("uses a 30-day window", () => expect(PURGE_DAYS).toBe(30));
});

describe("statusBadge", () => {
  it("labels every state", () => {
    expect(statusBadge({ status: "draft" })).toBe("draft");
    expect(statusBadge({ status: "published", version: 3, liveVersion: 3 })).toBe("live");
    expect(statusBadge({ status: "published", version: 4, liveVersion: 3 })).toBe("changes");
    expect(statusBadge({ status: "offline" })).toBe("offline");
    expect(statusBadge({ status: "deleted" })).toBe("deleted");
    expect(STATUS_LABEL).toEqual({ draft: "Draft", live: "Live", changes: "Changes not live", offline: "Offline", deleted: "Deleted" });
  });
});

describe("listNotices", () => {
  it("counts invitations going offline within 7 days and erasing within 24 hours", () => {
    const now = at("2027-02-20T06:00:00Z");
    const rows = [
      { status: "published", offlineOn: "2027-02-22" },
      { status: "published", offlineOn: "2027-02-27" },
      { status: "published", offlineOn: "2027-02-28" },
      { status: "offline", purgeAt: "2027-02-21T05:00:00Z" },
      { status: "deleted", purgeAt: "2027-02-22T07:00:00Z" },
    ];
    expect(listNotices(rows, now)).toEqual({ goingOffline: 2, erasingSoon: 1 });
  });
});
```
Add to `src/AdminModule/invitations/listing.test.js`: "all hides deleted" (rows draft, published, offline, deleted → `all` returns 3) and "deleted filter shows only deleted".

- [ ] **Step 2: Run and see them fail** — `npx vitest run src/InvitationModule/lib/lifecycle.test.js src/AdminModule/invitations/listing.test.js` → FAIL.

- [ ] **Step 3: Implement** — `src/InvitationModule/lib/lifecycle.js`:
```js
import { liveState } from "./liveState";

export const PURGE_DAYS = 30;
export const OFFLINE_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const STATUS_LABEL = { draft: "Draft", live: "Live", changes: "Changes not live", offline: "Offline", deleted: "Deleted" };

/** Today's date in India, whatever the server's clock zone. */
export function todayIST(now = Date.now()) {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(isoDate, n) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Latest event date (or the wedding date) plus 7 days; null when the draft has no date at all. */
export function defaultOfflineOn(content) {
  const dates = [...(content?.events ?? []).map((e) => e?.date), content?.mainDate].filter((d) => ISO_DATE.test(d ?? ""));
  if (dates.length === 0) return null;
  return addDays(dates.sort().at(-1), OFFLINE_AFTER_DAYS);
}

export function isOfflineDue(row, now = Date.now()) {
  return row?.status === "published" && ISO_DATE.test(row.offlineOn ?? "") && row.offlineOn <= todayIST(now);
}

export function isEraseDue(row, now = Date.now()) {
  if (row?.status !== "offline" && row?.status !== "deleted") return false;
  const at = Date.parse(row.purgeAt ?? "");
  return Number.isFinite(at) && at <= now;
}

export function statusBadge(row) {
  if (row.status === "offline" || row.status === "deleted") return row.status;
  return liveState(row);
}

/** Counts for the notices above the invitations list. */
export function listNotices(rows, now = Date.now()) {
  const weekAhead = addDays(todayIST(now), OFFLINE_AFTER_DAYS);
  let goingOffline = 0;
  let erasingSoon = 0;
  for (const row of rows) {
    if (row.status === "published" && ISO_DATE.test(row.offlineOn ?? "") && row.offlineOn <= weekAhead) goingOffline += 1;
    if (isEraseDue(row, now + DAY_MS)) erasingSoon += 1;
  }
  return { goingOffline, erasingSoon };
}
```
In `schema/invitation.js`: `STATUSES = ["draft", "published", "offline", "deleted"]`. In `listing.js` `filterInvitations`: `if (status === "all" ? row.status === "deleted" : row.status !== status) return false;`.

- [ ] **Step 4: Run** — `npx vitest run src/InvitationModule src/AdminModule/invitations` → PASS (fix any test that referenced `archived`).

- [ ] **Step 5: Commit** — `git commit -m "feat(lifecycle): offline/erase date rules, status badges and list filters"`.

---

### Task 2: Backend — fields, lifecycle Lambda, schedule, publish sets offlineOn

**Files:**
- Modify: `amplify/data/resource.ts`, `amplify/backend.ts`, `amplify/functions/invitation-publish/publish.ts` (+ test), `amplify/functions/invitation-public/lookup.ts` (+ test), `package.json`, `package-lock.json`
- Create: `amplify/functions/invitation-lifecycle/resource.ts`, `handler.ts`, `rules.ts`, `transitions.ts`, `erase.ts`, `run.ts`, and tests `rules.test.ts`, `transitions.test.ts`, `erase.test.ts`, `run.test.ts`, `handler.test.ts`

**Interfaces:**
- GraphQL (all `allow.group("admin")`, `returns(a.json())`, handler `invitationLifecycle`):
  - `takeInvitationOffline(id, expectedVersion)` → `{ status: "offline", offlineAt, purgeAt }`
  - `putInvitationOnline(id, expectedVersion, offlineOn)` → `{ status: "published", offlineOn }`
  - `setInvitationOfflineOn(id, expectedVersion, offlineOn)` → `{ offlineOn }`
  - `deleteInvitation(id, expectedVersion)` → `{ status: "deleted", deletedAt, purgeAt }`
  - `restoreInvitation(id, expectedVersion)` → `{ status, purgeAt }` (`purgeAt` null unless restored to offline)
  - `eraseInvitationNow(id, confirm)` → `{ erased: true }`
  - errorTypes: `VersionConflict`, `WrongStatus`, `BadDate`, `BadConfirm`, `NotFound`
- `Invitation` new fields: `offlineOn: a.date()`, `offlineAt: a.datetime()`, `deletedAt: a.datetime()`, `statusBeforeDelete: a.string()`, `purgeAt: a.datetime()`.
- `publishInvitation` gains optional arg `offlineOn: a.date()`, stored on first publish.
- `rules.ts` mirrors Task 1's `todayIST`, `addDays`, `isOfflineDue`, `isEraseDue`, `PURGE_DAYS` (Lambdas don't share `src/` code; keep identical tests).

- [ ] **Step 1: Dependency** — `npm install --save-dev @aws-sdk/client-s3@^3.1151.0` (same 3.x line as the other `@aws-sdk` packages), `npm install --package-lock-only`.

- [ ] **Step 2: Rules (test first)** — `rules.test.ts` = the `todayIST`, `addDays`, `isOfflineDue`, `isEraseDue` cases from Task 1 in TypeScript; then `rules.ts` with the same code typed.

- [ ] **Step 3: Transitions (test first)** — `transitions.ts` exports `takeOffline`, `putOnline`, `setOfflineOn`, `remove` (delete), `restore`, each `(db, tables, args, now: string)`. Pattern (same as Phase 3 `goLive`): `GetCommand` with `ConsistentRead: true`; check status and `version === expectedVersion` (else `VersionConflict`); one `UpdateCommand` with `ConditionExpression: "version = :v AND #status = :from"`; condition failure → `VersionConflict`. Rules:
  - `takeOffline`: from `published`; `SET #status = :offline, offlineAt = :now, purgeAt = :purge` (`purge = now + 30 d`).
  - `putOnline`: from `offline`; `offlineOn` must match `YYYY-MM-DD` and be `> todayIST(now)` else `BadDate` ("Pick a date after today"); `SET #status = :published, offlineOn = :d REMOVE offlineAt, purgeAt`.
  - `setOfflineOn`: from `published` or `offline` (condition `#status IN (:published, :offline)`); date must be `≥ todayIST(now)` else `BadDate`; `SET offlineOn = :d`.
  - `remove`: from `draft | published | offline`; `SET statusBeforeDelete = #status, #status = :deleted, deletedAt = :now, purgeAt = :purge`.
  - `restore`: from `deleted`; target = `statusBeforeDelete` (default `draft`); `SET #status = :target REMOVE deletedAt, statusBeforeDelete` plus `REMOVE purgeAt` unless target is `offline`, in which case `SET purgeAt = now + 30 d`.
  - Wrong starting status → `WrongStatus`.
  Tests (fake db like `publish.test.ts`): each transition's expression and values; conflict when version differs; conflict when the condition fails; `WrongStatus`; `BadDate` for today/past on `putOnline` and past on `setOfflineOn` (today allowed); restore to published clears `purgeAt`; restore to offline sets a fresh `purgeAt`.

- [ ] **Step 4: Erase (test first)** — `erase.ts`:
```ts
import { DeleteObjectsCommand, ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3";
import { DeleteCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type Db = Pick<DynamoDBDocumentClient, "send">;
type S3 = Pick<S3Client, "send">;
const SAFE_ID = /^[A-Za-z0-9-]{8,}$/;

/** Deletes one invitation's own files, then its link name (if still its own), then the record. Safe to repeat. */
export async function eraseInvitation(
  { db, s3 }: { db: Db; s3: S3 },
  { tables, bucket }: { tables: { invitation: string; slug: string }; bucket: string },
  inv: { id: string; slug?: string | null },
) {
  if (!SAFE_ID.test(inv.id)) throw new Error(`refusing to erase unsafe id ${JSON.stringify(inv.id)}`);
  const Prefix = `invitations/${inv.id}/`;
  let ContinuationToken: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix, ContinuationToken }));
    const keys = (page.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key.startsWith(Prefix));
    if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }));
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);

  if (inv.slug) {
    try {
      await db.send(new DeleteCommand({
        TableName: tables.slug, Key: { slug: inv.slug },
        ConditionExpression: "invitationId = :id", ExpressionAttributeValues: { ":id": inv.id },
      }));
    } catch (err: any) {
      if (err?.name !== "ConditionalCheckFailedException") throw err; // already gone or reused: fine
    }
  }
  try {
    await db.send(new DeleteCommand({
      TableName: tables.invitation, Key: { id: inv.id },
      ConditionExpression: "#status IN (:offline, :deleted)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":offline": "offline", ":deleted": "deleted" },
    }));
  } catch (err: any) {
    if (err?.name !== "ConditionalCheckFailedException") throw err; // restored meanwhile, or already erased
  }
}
```
Tests: prefix is exactly `invitations/<id>/`; paginates across two pages; skips the delete call for an empty page; refuses ids like `""`, `"../x"`, `"a/b"`; a reused slug (condition failure) is not an error; an already-erased record is not an error; an S3 failure throws before any DynamoDB delete.

- [ ] **Step 5: Daily run (test first)** — `run.ts` exports `runLifecycle({ db, s3 }, cfg, now: Date) → { offline, erased, failed }`: paginated `ScanCommand` (`ProjectionExpression` id, #status, version, slug, offlineOn, purgeAt; `ConsistentRead: true`); for each row: if `isOfflineDue` → conditional update (`#status = :published AND offlineOn = :seen`) to offline (condition failure → skip silently); else if `isEraseDue` → `eraseInvitation` (errors → `failed += 1`, `console.error("lifecycle: erase failed", id, err)`). Finally `console.log(\`lifecycle: offline=${n} erased=${n} failed=${n}\`)`. Tests: takes a due published row offline; leaves a not-yet-due row; a row restored between scan and write is skipped (condition failure) without counting a failure; erase failure counts and continues with the next row; pagination; summary line.

- [ ] **Step 6: Handler** — `handler.ts`: if the event has no `fieldName` (EventBridge Scheduler event) → `runLifecycle(...)`; otherwise require `identity.groups` to include `admin`, then dispatch the six mutations. `eraseInvitationNow`: load (consistent), status must be `offline` or `deleted` → otherwise `WrongStatus` ("Take it offline or delete it first"); `confirm` must equal `slug ?? "delete"` → else `BadConfirm`; then `eraseInvitation`. Unknown errors → log + generic `Error("Something went wrong. Please try again.")`. `handler.test.ts`: scheduled event routes to the run; non-admin is refused; `eraseInvitationNow` refuses a live invitation and a wrong confirmation.

- [ ] **Step 7: Resource and wiring**
`resource.ts`:
```ts
import { defineFunction } from "@aws-amplify/backend";

export const invitationLifecycle = defineFunction({
  name: "invitation-lifecycle",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  // 21:30 UTC = 03:00 IST, daily.
  schedule: "30 21 * * ? *",
  resourceGroupName: "data",
});
```
`amplify/data/resource.ts`: add the five `Invitation` fields; add `offlineOn: a.date()` to `publishInvitation` arguments; add the six mutations (args as in Interfaces, `.returns(a.json())`, `.authorization((allow) => [allow.group("admin")])`, `.handler(a.handler.function(invitationLifecycle))`).
`amplify/backend.ts`: add `invitationLifecycle` to `defineBackend`; `tables.Invitation.grantReadWriteData(fn)`, `tables.InvitationSlug.grantReadWriteData(fn)`; S3:
```ts
const lifecycleFn = backend.invitationLifecycle.resources.lambda;
bucket.grantRead(lifecycleFn, "invitations/*");   // includes ListBucket scoped by prefix condition
bucket.grantDelete(lifecycleFn, "invitations/*");
backend.invitationLifecycle.addEnvironment("INVITATION_MEDIA_BUCKET", bucket.bucketName);
backend.invitationLifecycle.addEnvironment("INVITATION_TABLE", tables["Invitation"].tableName);
backend.invitationLifecycle.addEnvironment("INVITATION_SLUG_TABLE", tables["InvitationSlug"].tableName);
```
If `grantRead` with a key pattern does not allow `s3:ListBucket` for the prefix, add an explicit `PolicyStatement` (`s3:ListBucket` on the bucket ARN with condition `StringLike s3:prefix = invitations/*`) and say so in the report.

- [ ] **Step 8: Publish stores offlineOn; preview allowed when offline**
- `publish.ts` `goLive(first=true)`: accept `offlineOn?: string` (validated `YYYY-MM-DD`, else ignored) and add `offlineOn = :off` to the SET when present. Test: stored when given; omitted when absent; ignored when malformed.
- Handler passes `a.offlineOn`.
- `lookup.ts`: the preview branch allows `draft | published | offline` (never `deleted`). Test: offline + right token → preview; offline without token → null; deleted + right token → null.

- [ ] **Step 9: Verify** — `npx vitest run amplify`, `npm test`, `npx tsc --noEmit -p amplify`, clean-copy `npm ci`, then `npx ampx sandbox --once` (background, several minutes). Expected: all pass; the deploy succeeds; `amplify_outputs.json` lists the six mutations.

- [ ] **Step 10: Commit** — `git add amplify package.json package-lock.json && git commit -m "feat(backend): lifecycle Lambda — offline, delete, restore, erase and daily schedule"`.

---

### Task 3: Server layer — lifecycle actions, data fields, publish passes offlineOn

**Files:**
- Modify: `src/AdminModule/invitations/data.js`, `src/AdminModule/invitations/publishActions.js` (+ tests), `src/AdminModule/invitations/publishing.js` (+ test)
- Create: `src/AdminModule/invitations/lifecycleActions.js`, `lifecycleActions.test.js`

**Interfaces:**
- Consumes: Task 1 `defaultOfflineOn`; Task 2 mutations and error types.
- Produces:
  - `getInvitation` adds `offlineOn, offlineAt, deletedAt, statusBeforeDelete, purgeAt` (null when absent). `LIST_FIELDS` adds `offlineOn, purgeAt`.
  - data functions (same `mutate` helper): `takeOfflineRecord({ id, expectedVersion })`, `putOnlineRecord({ id, expectedVersion, offlineOn })`, `setOfflineOnRecord({ id, expectedVersion, offlineOn })`, `deleteRecord({ id, expectedVersion })`, `restoreRecord({ id, expectedVersion })`, `eraseNowRecord({ id, confirm })`; `publishRecord` accepts `offlineOn`.
  - `publishing.js` `publishFailure` maps the new errorTypes: `WrongStatus` → "This invitation changed — reload the page.", `BadDate` → "Pick a date after today", `BadConfirm` → "That doesn't match — type it exactly as shown."
  - `lifecycleActions.js` ("use server"), each `requireStaff()` first, wrapped like `publishActions.attempt`, `refresh(id)` on success:
    - `takeOfflineAction({ id, expectedVersion })` → `{ ok, status, offlineAt, purgeAt } | failure`
    - `putOnlineAction({ id, expectedVersion, offlineOn })`
    - `setOfflineOnAction({ id, expectedVersion, offlineOn })`
    - `deleteInvitationAction({ id, expectedVersion })`
    - `restoreInvitationAction({ id, expectedVersion })`
    - `eraseNowAction({ id, confirm })` → `{ ok: true }` then the caller navigates to `/admin/invitations`
  - `publishAction` passes `offlineOn: defaultOfflineOn(approvedDraft)` to `publishRecord` (the draft the checklist approved).

- [ ] **Step 1: Tests first** — `lifecycleActions.test.js` mocks `@/AdminModule/auth/server`, `next/cache`, `./data` (pattern of `publishActions.test.js`): every action calls `requireStaff` before data; each maps `{ data }` to `{ ok: true, ... }`; `VersionConflict` → `{ ok: false, conflict: true }`; `BadDate` → message "Pick a date after today"; a thrown error → generic `PUBLISH_FAILED`; `putOnlineAction`/`setOfflineOnAction` reject a malformed date (`"14-02-2027"`) before calling data. Add to `publishActions.test.js`: publish passes `offlineOn` = latest event + 7 from the approved draft. Add to `publishing.test.js`: the three new mappings.

- [ ] **Step 2: Implement** the data functions, the mappings, `lifecycleActions.js`, and the `publishAction` change. Edit page (`src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js`) passes `lifecycleActions={{ takeOfflineAction, putOnlineAction, setOfflineOnAction, deleteInvitationAction, restoreInvitationAction, eraseNowAction }}` to `EditorShell`.

- [ ] **Step 3: Run** — `npx vitest run src/AdminModule/invitations`, then `npm test` → PASS.

- [ ] **Step 4: Commit** — `git commit -m "feat(invitations): lifecycle server actions and offline date on publish"`.

---

### Task 4: Staff screens — list, editor banners, actions, step ⑦

**Files:**
- Modify: `src/AdminModule/invitations/InvitationList.jsx` (+ test), `src/app/(admin)/admin/(staff)/invitations/page.js` (pass `now` if not already), `src/AdminModule/editor/EditorShell.jsx` (+ test), `src/AdminModule/editor/steps/RsvpStep.jsx` (+ test), `src/AdminModule/editor/test-utils.jsx`
- Create: `src/AdminModule/editor/lifecycle/LifecycleBanner.jsx`, `InvitationMenu.jsx`, `EraseDialog.jsx`, `OfflineDateField.jsx`, `lifecycle.test.jsx`

**Interfaces:**
- Consumes: Task 1 `statusBadge`, `STATUS_LABEL`, `listNotices`, `todayIST`; Task 3 `lifecycleActions` prop and new `invitation` fields.
- Dates shown to staff use the existing `formatDate` (IST, long form) for `offlineOn` and the date part of `offlineAt`/`purgeAt` (convert with `todayIST(Date.parse(x))`).

- [ ] **Step 1: List (test first)** — badges via `statusBadge` + `STATUS_LABEL` (classes: offline `bg-stone-200 text-stone-800`, deleted `bg-red-100 text-red-900` with " · erased on <date>"); filter options All / Draft / Live (`published`) / Offline / Deleted; notices from `listNotices(rows, now)` rendered only when > 0, each a button that sets the filter: the going-offline notice → `Live` (`published`); the erasing-soon notice → `Deleted` when any due row is deleted, otherwise `Offline`. Remove all `archived` handling. Tests: each badge; All hides deleted; Deleted filter; both notices with correct counts; no notices when zero.

- [ ] **Step 2: Lifecycle components (test first)** in `lifecycle.test.jsx`:
  - `LifecycleBanner({ status, offlineAt, purgeAt, deletedAt, pending, onPutOnline, onRestore, onEraseNow })`: offline → "Offline since <date> — will be erased on <date>" + **Put back online**; deleted → "Deleted — will be erased on <date>" + **Restore** + **Delete permanently now**; otherwise renders nothing.
  - **Put back online** opens an inline date picker (`<input type="date" min=tomorrow>`), default = the stored `offlineOn` if it's after today, else empty; submitting a non-future date shows "Pick a date after today" without calling the action.
  - `InvitationMenu({ status, onTakeOffline, onDelete })`: a "⋯" button (aria-label "More actions") opening **Take offline now** (only when `published`) and **Delete** (not when `deleted`); both use `window.confirm` with the exact copy from Global Constraints (`<date>` = today + 30 in long form).
  - `EraseDialog({ slug, onConfirm })`: text "This permanently erases the invitation, its photos, film and uploaded music, and frees its link name. Library songs are kept. Type <b>{slug ?? "delete"}</b> to confirm."; the **Erase now** button is enabled only on an exact match.
  - `OfflineDateField({ value, onSave, pending, lastEventDate })`: label "Take offline on"; date input `min=today`; **Save date** button; hint "This is before the last event (<date>)" when `value < lastEventDate`.

- [ ] **Step 3: EditorShell wiring (test first)** — extend `test-utils.jsx` defaults with `status: "draft"`, `offlineOn: null`, `offlineAt: null`, `deletedAt: null`, `purgeAt: null` and a `lifecycleActions` object of `vi.fn()`s. Hold `lifecycle` state `{ status, offlineOn, offlineAt, deletedAt, purgeAt }` alongside Phase 3's `live` state (keep `live.status` in sync — one source of truth for status: store it once and derive both). Each action goes through the existing `exclusive()` pending guard and `call()` offline catch, sends `expectedVersion` from `settle()` (pending edits saved first; skip `settle()` when deleted), and on `conflict` shows the existing conflict banner. Behaviour:
  - Render `LifecycleBanner` under `SaveBanners`; render `InvitationMenu` next to `SaveStatus`.
  - **Take offline now** / **Delete** / **Restore** / **Put back online** update `lifecycle` state from the result.
  - **Delete permanently now** opens `EraseDialog`; on success `allowLeave()` then `window.location.assign("/admin/invitations")`.
  - When `status === "deleted"`: wrap the step content in `<fieldset disabled>`, hide Back/Next, hide the Publish panel's actions, and do not render `ChangesNote`. Autosave never runs because nothing can change; assert no save call after attempting to type.
  - Pass `offlineField={{ value, onSave, pending, lastEventDate }}` to steps; step ⑦ renders `OfflineDateField` when status is `published` or `offline`.
  Tests: take offline → banner shows; put back online with a valid date → banner gone; delete → read-only (typing changes nothing, save not called) and Restore returns to the previous state; erase now navigates after a correct confirmation; conflict on any action → conflict banner; step ⑦ date save calls `setOfflineOnAction`.

- [ ] **Step 4: Step ⑦ RSVP hidden** — `RsvpStep.jsx` no longer renders the RSVP group; it renders `OfflineDateField` (when given) and the existing non-RSVP settings (e.g. the credit toggle). Stored `rsvp` values are untouched. Update `RsvpStep.test.jsx`: no "Ask guests to RSVP" toggle. If the step's title in `steps/index.js` says "RSVP & settings", rename it to "Settings" and update tests/guide anchors that reference the title (the help link anchor `#editor-step-7…` must still resolve — update the guide heading and `guideHref` together).

- [ ] **Step 5: Run** — `npm test` (pristine), `npx next build` (check ports 3000–3130 are free first).

- [ ] **Step 6: Commit** — `git commit -m "feat(editor): offline, delete, restore and erase in the list and editor; hide RSVP settings"`.

---

### Task 5: Staff guide, verification, preview branch

**Files:** Modify `docs/admin-guide.md`.

- [ ] **Step 1: Guide** — add sections: **After the wedding** (Take offline on, default, changing it), **Taking an invitation offline and putting it back**, **Deleting and restoring**, **Permanent erase** (what is erased: the invitation, its photos, film and uploaded music, its link name; what is kept: Music Library songs; when: 30 days after offline/delete, or now with typed confirmation), list badges and notices. Remove the RSVP settings description from step ⑦ and note RSVPs are coming later. Keep step headings/anchors consistent with `guideHref`.

- [ ] **Step 2: Automated checks** — `npm test`, `npx tsc --noEmit -p amplify`, `npx next build`, clean-copy `npm ci --ignore-scripts --no-audit --no-fund`, `npx ampx sandbox --once`.

- [ ] **Step 3: Commit** — `git commit -m "docs(admin-guide): offline, delete, restore and erase"`.

- [ ] **Step 4: Ask the owner before pushing** — STOP: push `feature/invitations-phase-5` and connect it as an Amplify preview branch? Only after a yes.

- [ ] **Step 5: Preview QA (controller + owner)**
  - Publish a test invitation; Take offline now → link shows "no longer available"; Put back online → live again.
  - Delete → hidden from All, shown under Deleted, editor read-only; Restore → back as it was.
  - Erase now (typed confirmation) on a test invitation with photos → record gone, its `invitations/<id>/` files gone (check with `aws s3 ls`), link name reusable; a Music Library song it used still plays elsewhere.
  - Scheduled run: set a test invitation's `offlineOn` to a past date via Take offline on (min=today, so use today), then invoke the function directly with `aws lambda invoke --function-name <invitation-lifecycle name> --payload '{"source":"manual"}'` → it goes offline; read the summary line in its CloudWatch log group. Erase-on-schedule is covered by unit tests (purgeAt can't be backdated from the UI).
  - Guest probe (Phase 3 script pattern): the six lifecycle mutations are `Unauthorized` for the guest role.
