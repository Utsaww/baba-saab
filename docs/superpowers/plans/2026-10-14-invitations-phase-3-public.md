# Digital Invitations — Phase 3: Publishing and the Public Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can send a private preview link, publish an invitation at `/invitation/<slug>`, push later edits live with one click, share a rich WhatsApp card and download a printable QR code; drafts and unknown links stay invisible.

**Architecture:** `Invitation` gains `slug`, `previewToken`, `publishedContent`, `liveVersion`, `publishedAt`, `liveUpdatedAt`; a new `InvitationSlug` table guarantees unique link names. Writes that touch both tables run in one small Lambda (`invitation-publish`) using a DynamoDB transaction; the publish checklist is enforced in the Next server action before the Lambda is called, and the Lambda's version condition makes that check race-free. Guests read through one public AppSync query (`publicInvitation`, two-step JS pipeline resolver, identity-pool **guest** auth) that returns only the live snapshot — or the draft when the correct preview token is supplied. The Next page renders per request and the OG image is generated with `next/og`.

**Tech Stack:** Next.js 14.2 App Router (JS in `src/`, alias `@/*`), Tailwind, Vitest 2 + Testing Library (jsdom; user-event v14), zod 3; Amplify Gen 2 (`amplify/`, TypeScript): AppSync JS resolvers, `defineFunction`, `aws-cdk-lib`; `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`; `qrcode` (browser); `next/og`.

**Spec:** `docs/superpowers/specs/2026-10-13-invitations-phase-3-public-design.md` (binding), extends `docs/superpowers/specs/2026-10-06-digital-invitations-design.md`.

## Plan rulings against the spec (recorded so reviewers don't flag them)

- **R1 — No page cache (spec §6).** The live page renders per request; React `cache()` dedupes the lookup between `generateMetadata` and the page. Reason: on Amplify `WEB_COMPUTE` the Next data cache is per compute instance, so `revalidateTag` from one instance cannot reliably clear others; a per-request render (one AppSync query, ~100 ms) meets the 2 s target and makes Update live instant. The spec's own fallback allows this.
- **R2 — Backend error status (spec §6).** Next's `error.js` responds 500, not 503. The message is what matters; 500 is accepted.
- **R3 — QR / link host (spec §8).** Links and QR codes use `window.location.origin` in the admin (the admin and public pages share a host), which gives the same result as `ADMIN_SITE_URL`'s origin without exposing a server env var to the browser.
- **R4 — `setSlug` takes no `expectedVersion` (spec §4).** The slug is a record field, not draft content; the Lambda's `status = draft` condition is the lock.
- **R5 — RSVP on live pages before Phase 4.** RSVPs are not stored until Phase 4, so the live page renders with `rsvp.enabled = false` (the form would otherwise pretend to accept answers). Preview pages keep the existing preview-mode RSVP behaviour.

## Global Constraints

- Never commit to `main`; work on `feature/invitations-phase-3`. Never stage `amplify_outputs.json`.
- Slug: 3–60 chars, `[a-z0-9-]`, no leading/trailing/doubled dashes; reserved `new`, `preview`, `admin`, `api`; generated `<bride>-weds-<groom>-<4char>` from English names, else `invitation-<6char>`; suffix alphabet `abcdefghijkmnpqrstuvwxyz23456789` (no `0 o 1 l`).
- Preview token: `crypto.randomBytes(16).toString("base64url")` (22 chars, 128 bits).
- Preview banner text: `Preview — not published yet`. Not-available text: `This invitation is no longer available`. Error text: `Couldn't load this invitation — please try again in a minute`.
- Changes note: `You have changes guests can't see yet`; button `Update live invitation`. Publish confirm: `Publish? The link name can't be changed after this.` New-preview confirm: `The old preview link will stop working.`
- List badges: `Draft`, `Live`, `Changes not live`.
- QR: 1024×1024 PNG, error correction `M`, margin 4, black `#000000` on white `#ffffff`, file `<slug>-qr.png`, encodes `<origin>/invitation/<slug>`.
- OG image 1200×630; title `<Bride> & <Groom> are getting married` (`hi`: `<वधू> और <वर> का शुभ विवाह`); preview links get title `Wedding invitation preview`.
- A media file is deleted only when neither the draft nor `publishedContent` references it.
- After any dependency change: `npm install --package-lock-only`, then verify `npm ci` on a clean copy (Amplify's `npm ci` is stricter than local npm).
- Public responses never include `createdBy`, `updatedBy`, `searchText`, `previewToken`, `version`, `liveVersion`.

## Review Focus

1. **Preview token leaking into the live cache or share links** — a preview visit must never change what the plain link shows, and share buttons must strip `?preview` (Task 4 test).
2. **Removed photo still on the live page** — removing a photo after publishing must not delete the file until Update live drops it (Task 1 + Task 6 tests).
3. **Draft visible without token** — a draft slug, a wrong token, an empty token, and a malformed slug all resolve to "not available" (Task 2 resolver tests).
4. **Publishing stale content** — publish must copy exactly the version the checklist approved; a save from another tab in between gives a conflict, not a silent publish (Task 2 Lambda test + Task 3 action test).
5. **Hindi-only invitations** — slug falls back to `invitation-<6char>`, OG title uses Hindi, and the OG image renders Devanagari (Task 1 + Task 5 tests).

---

### Task 1: Pure helpers — slugs, tokens, live state, media keep-rule

**Files:**
- Create: `src/InvitationModule/lib/slug.js`, `src/InvitationModule/lib/slug.test.js`
- Create: `src/InvitationModule/lib/liveState.js`, `src/InvitationModule/lib/liveState.test.js`
- Modify: `src/InvitationModule/lib/mediaKeys.js` (add `mediaKeysToDelete`), `src/InvitationModule/lib/mediaKeys.test.js`

**Interfaces:**
- Produces: `SLUG_MAX = 60`, `RESERVED_SLUGS`, `slugify(text) → string`, `generateSlug(content, randomChars?) → string`, `validateSlug(slug) → null | string` (message), `randomSuffix(n, randomBytes?) → string`
- Produces: `liveState({ status, version, liveVersion }) → "draft" | "live" | "changes"`, `LIVE_BADGE = { draft: "Draft", live: "Live", changes: "Changes not live" }`
- Produces: `mediaKeysToDelete({ before, after, keep = [], invitationId }) → string[]` — keys in `before` not in `after` and not referenced by any content in `keep`, own-folder only (reuses `removedMediaKeys` + `mediaKeys`).

- [ ] **Step 1: Write the failing tests**

`src/InvitationModule/lib/slug.test.js`:
```js
import { describe, expect, it } from "vitest";
import { generateSlug, randomSuffix, RESERVED_SLUGS, slugify, validateSlug } from "./slug";

const content = (bride, groom) => ({ couple: { bride: { name: bride }, groom: { name: groom } } });
const fixed = (n) => "k3f9pq".slice(0, n);

describe("slugify", () => {
  it("lower-cases, strips accents and joins words with single dashes", () => {
    expect(slugify("  Zoë  Ánne ")).toBe("zoe-anne");
    expect(slugify("Rahul_Kumar!!")).toBe("rahul-kumar");
  });
  it("drops non-latin letters", () => {
    expect(slugify("प्रिया")).toBe("");
  });
});

describe("generateSlug", () => {
  it("uses English names with a 4-char suffix", () => {
    expect(generateSlug(content({ en: "Priya" }, { en: "Rahul" }), fixed)).toBe("priya-weds-rahul-k3f9");
  });
  it("falls back to invitation-<6> when an English name is missing", () => {
    expect(generateSlug(content({ hi: "प्रिया" }, { en: "Rahul" }), fixed)).toBe("invitation-k3f9pq");
  });
  it("keeps the result within 60 chars", () => {
    const long = "a".repeat(50);
    const slug = generateSlug(content({ en: long }, { en: long }), fixed);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(validateSlug(slug)).toBeNull();
  });
});

describe("randomSuffix", () => {
  it("uses only the unambiguous alphabet", () => {
    const s = randomSuffix(200);
    expect(s).toHaveLength(200);
    expect(s).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]+$/);
  });
});

describe("validateSlug", () => {
  it.each(["priya-weds-rahul", "abc", "a1-b2"])("accepts %s", (s) => expect(validateSlug(s)).toBeNull());
  it.each([
    ["ab", "Use 3 to 60 characters."],
    ["a".repeat(61), "Use 3 to 60 characters."],
    ["Priya", "Use only lowercase letters, numbers and dashes."],
    ["priya_rahul", "Use only lowercase letters, numbers and dashes."],
    ["-priya", "Don't start or end with a dash, or use two dashes together."],
    ["priya-", "Don't start or end with a dash, or use two dashes together."],
    ["priya--rahul", "Don't start or end with a dash, or use two dashes together."],
  ])("rejects %s", (s, message) => expect(validateSlug(s)).toBe(message));
  it("rejects reserved names", () => {
    for (const s of RESERVED_SLUGS) expect(validateSlug(s)).toBe("That link name is reserved — choose another.");
  });
  it("rejects non-strings", () => expect(validateSlug(undefined)).toBe("Use 3 to 60 characters."));
});
```

`src/InvitationModule/lib/liveState.test.js`:
```js
import { describe, expect, it } from "vitest";
import { LIVE_BADGE, liveState } from "./liveState";

describe("liveState", () => {
  it("is draft until published", () => expect(liveState({ status: "draft", version: 5, liveVersion: null })).toBe("draft"));
  it("is live when the live copy is the latest save", () =>
    expect(liveState({ status: "published", version: 7, liveVersion: 7 })).toBe("live"));
  it("has changes when a later save is not live", () =>
    expect(liveState({ status: "published", version: 8, liveVersion: 7 })).toBe("changes"));
  it("labels each state", () => expect(LIVE_BADGE).toEqual({ draft: "Draft", live: "Live", changes: "Changes not live" }));
});
```

Append to `src/InvitationModule/lib/mediaKeys.test.js`:
```js
import { mediaKeysToDelete } from "./mediaKeys";

describe("mediaKeysToDelete", () => {
  const id = "inv-1";
  const withCover = (key) => ({ media: { coverKey: key, gallery: [] } });
  it("deletes a removed file nobody else uses", () => {
    expect(mediaKeysToDelete({ before: withCover("invitations/inv-1/a.jpg"), after: withCover(undefined), invitationId: id })).toEqual([
      "invitations/inv-1/a.jpg",
    ]);
  });
  it("keeps a removed file the live copy still shows", () => {
    expect(
      mediaKeysToDelete({
        before: withCover("invitations/inv-1/a.jpg"),
        after: withCover(undefined),
        keep: [withCover("invitations/inv-1/a.jpg")],
        invitationId: id,
      }),
    ).toEqual([]);
  });
  it("ignores null keep entries", () => {
    expect(
      mediaKeysToDelete({ before: withCover("invitations/inv-1/a.jpg"), after: {}, keep: [null, undefined], invitationId: id }),
    ).toEqual(["invitations/inv-1/a.jpg"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/InvitationModule/lib/slug.test.js src/InvitationModule/lib/liveState.test.js src/InvitationModule/lib/mediaKeys.test.js`
Expected: FAIL — modules/exports not found.

- [ ] **Step 3: Implement**

`src/InvitationModule/lib/slug.js`:
```js
export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
export const RESERVED_SLUGS = ["new", "preview", "admin", "api"];
const SUFFIX_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Random characters from an alphabet without look-alikes (no 0/o, 1/l). Works in the browser and Node. */
export function randomSuffix(n, randomBytes = (len) => crypto.getRandomValues(new Uint8Array(len))) {
  return Array.from(randomBytes(n), (b) => SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length]).join("");
}

export function slugify(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "<bride>-weds-<groom>-<4char>" from the English names, or "invitation-<6char>" when one is missing. */
export function generateSlug(content, random = randomSuffix) {
  const bride = slugify(content?.couple?.bride?.name?.en);
  const groom = slugify(content?.couple?.groom?.name?.en);
  if (!bride || !groom) return `invitation-${random(6)}`;
  const suffix = `-${random(4)}`;
  const middle = "-weds-";
  // Trim each name evenly so the whole slug fits.
  const room = SLUG_MAX - suffix.length - middle.length;
  const half = Math.floor(room / 2);
  const trim = (s, n) => s.slice(0, n).replace(/-+$/, "");
  return `${trim(bride, half)}${middle}${trim(groom, room - half)}${suffix}`;
}

/** null when the slug is acceptable, otherwise a sentence for staff. */
export function validateSlug(slug) {
  if (typeof slug !== "string" || slug.length < SLUG_MIN || slug.length > SLUG_MAX) return "Use 3 to 60 characters.";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Use only lowercase letters, numbers and dashes.";
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) {
    return "Don't start or end with a dash, or use two dashes together.";
  }
  if (RESERVED_SLUGS.includes(slug)) return "That link name is reserved — choose another.";
  return null;
}
```

`src/InvitationModule/lib/liveState.js`:
```js
export const LIVE_BADGE = { draft: "Draft", live: "Live", changes: "Changes not live" };

/** Where an invitation stands for guests: not published, live and current, or live with saved edits not yet pushed. */
export function liveState({ status, version, liveVersion }) {
  if (status !== "published") return "draft";
  return Number.isInteger(liveVersion) && version > liveVersion ? "changes" : "live";
}
```

Add to `src/InvitationModule/lib/mediaKeys.js` (below `removedMediaKeys`):
```js
/** Files to delete after a change: dropped by `after`, and not used by any content in `keep` (e.g. the live copy). */
export function mediaKeysToDelete({ before, after, keep = [], invitationId }) {
  const kept = new Set(keep.filter(Boolean).flatMap((c) => mediaKeys(c)));
  return removedMediaKeys(before, after, invitationId).filter((key) => !kept.has(key));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/InvitationModule/lib`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/lib/slug.js src/InvitationModule/lib/slug.test.js src/InvitationModule/lib/liveState.js src/InvitationModule/lib/liveState.test.js src/InvitationModule/lib/mediaKeys.js src/InvitationModule/lib/mediaKeys.test.js
git commit -m "feat(invitations): slug, live-state and media keep-rule helpers"
```

---

### Task 2: Backend — schema, publish Lambda, public lookup

**Files:**
- Modify: `amplify/data/resource.ts`, `amplify/backend.ts`, `package.json`, `package-lock.json`
- Create: `amplify/functions/invitation-publish/resource.ts`, `handler.ts`, `publish.ts`, `publish.test.ts`
- Create: `amplify/data/publicInvitation.slug.js`, `amplify/data/publicInvitation.invitation.js`, `amplify/data/publicInvitation.d.ts`, `amplify/data/publicInvitation.test.ts`

**Interfaces:**
- Consumes: existing `Invitation` model, `saveInvitation` (unchanged; it must keep bumping `version` and never touch the new fields).
- Produces (GraphQL, all `allow.group("admin")` unless noted):
  - `Invitation` new fields: `slug: String`, `previewToken: String`, `publishedContent: AWSJSON`, `liveVersion: Int`, `publishedAt: AWSDateTime`, `liveUpdatedAt: AWSDateTime`
  - model `InvitationSlug` identifier `slug`: `{ slug: String!, invitationId: String! }`, staff read only
  - `setInvitationSlug(id: ID!, slug: String!): AWSJSON` → `{ slug }`; errors `SlugTaken`, `NotDraft`, `InvalidSlug`
  - `regeneratePreviewToken(id: ID!): AWSJSON` → `{ previewToken }`
  - `publishInvitation(id: ID!, expectedVersion: Int!): AWSJSON` → `{ status, liveVersion, publishedAt, liveUpdatedAt }`; errors `VersionConflict`, `NotDraft`, `NoSlug`
  - `updateLiveInvitation(id: ID!, expectedVersion: Int!): AWSJSON` → `{ liveVersion, liveUpdatedAt }`; errors `VersionConflict`, `NotPublished`
  - `publicInvitation(slug: String!, previewToken: String): PublicInvitation` with `allow.guest()`; `PublicInvitation { mode: String!, templateId: String!, content: AWSJSON! }`; `null` when not visible.

- [ ] **Step 1: Add dependencies**

```bash
npm install --save-dev @aws-sdk/client-dynamodb@^3.1147.0 @aws-sdk/lib-dynamodb@^3.1147.0
npm install --package-lock-only
```
(Pin to the same 3.x line as `@aws-sdk/client-cognito-identity-provider` already in `package.json`.)

- [ ] **Step 2: Write the failing Lambda tests**

`amplify/functions/invitation-publish/publish.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { publish, regenerateToken, setSlug, updateLive, PublishError } from "./publish";

const NOW = "2026-10-14T10:00:00.000Z";
const tables = { invitation: "Inv", slug: "Slug" };
function fakeDb(item: Record<string, unknown> | undefined, opts: { failTransact?: number } = {}) {
  const calls: any[] = [];
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      calls.push(cmd);
      const name = cmd.constructor.name;
      if (name === "GetCommand") return { Item: item };
      if (name === "TransactWriteCommand" && opts.failTransact !== undefined) {
        const reasons = cmd.input.TransactItems.map((_: unknown, i: number) => ({
          Code: i === opts.failTransact ? "ConditionalCheckFailed" : "None",
        }));
        throw Object.assign(new Error("cancelled"), { name: "TransactionCanceledException", CancellationReasons: reasons });
      }
      if (name === "UpdateCommand" && opts.failTransact === -1) {
        throw Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });
      }
      return { Attributes: {} };
    }),
  };
}
const draft = { id: "inv-1", status: "draft", version: 4, slug: "old-name", content: '{"a":1}' };

describe("setSlug", () => {
  it("claims the new slug, points the invitation at it and releases the old one in one transaction", async () => {
    const db = fakeDb(draft);
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "priya-weds-rahul" }, NOW)).resolves.toEqual({ slug: "priya-weds-rahul" });
    const tx = db.calls.find((c) => c.constructor.name === "TransactWriteCommand").input.TransactItems;
    expect(tx[0].Put.TableName).toBe("Slug");
    expect(tx[0].Put.Item).toMatchObject({ slug: "priya-weds-rahul", invitationId: "inv-1", __typename: "InvitationSlug" });
    expect(tx[0].Put.ConditionExpression).toBe("attribute_not_exists(slug)");
    expect(tx[1].Update.ConditionExpression).toContain("#status = :draft");
    expect(tx[2].Delete).toMatchObject({ TableName: "Slug", Key: { slug: "old-name" } });
  });
  it("does nothing when the slug is unchanged", async () => {
    const db = fakeDb(draft);
    await setSlug(db as any, tables, { id: "inv-1", slug: "old-name" }, NOW);
    expect(db.calls.some((c) => c.constructor.name === "TransactWriteCommand")).toBe(false);
  });
  it("reports a taken slug", async () => {
    const db = fakeDb(draft, { failTransact: 0 });
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "taken-name" }, NOW)).rejects.toMatchObject({ name: "SlugTaken" });
  });
  it("refuses once published", async () => {
    const db = fakeDb({ ...draft, status: "published" });
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "new-name" }, NOW)).rejects.toMatchObject({ name: "NotDraft" });
  });
  it("rejects an invalid slug before touching the database", async () => {
    const db = fakeDb(draft);
    await expect(setSlug(db as any, tables, { id: "inv-1", slug: "Bad Slug" }, NOW)).rejects.toMatchObject({ name: "InvalidSlug" });
    expect(db.send).not.toHaveBeenCalled();
  });
});

describe("publish", () => {
  it("copies the approved version's content live, conditioned on that version", async () => {
    const db = fakeDb(draft);
    const result = await publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW);
    expect(result).toEqual({ status: "published", liveVersion: 4, publishedAt: NOW, liveUpdatedAt: NOW });
    const upd = db.calls.find((c) => c.constructor.name === "UpdateCommand").input;
    expect(upd.ExpressionAttributeValues).toMatchObject({ ":content": '{"a":1}', ":v": 4, ":draft": "draft", ":published": "published" });
    expect(upd.ConditionExpression).toBe("version = :v AND #status = :draft");
  });
  it("is a conflict when the stored version moved on", async () => {
    const db = fakeDb({ ...draft, version: 5 });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
  });
  it("is a conflict when a save lands between read and write", async () => {
    const db = fakeDb(draft, { failTransact: -1 });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "VersionConflict" });
  });
  it("needs a slug", async () => {
    const db = fakeDb({ ...draft, slug: null });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "NoSlug" });
  });
  it("refuses an already published invitation", async () => {
    const db = fakeDb({ ...draft, status: "published" });
    await expect(publish(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "NotDraft" });
  });
});

describe("updateLive", () => {
  it("pushes the current content live for a published invitation", async () => {
    const db = fakeDb({ ...draft, status: "published", version: 9 });
    await expect(updateLive(db as any, tables, { id: "inv-1", expectedVersion: 9 }, NOW)).resolves.toEqual({ liveVersion: 9, liveUpdatedAt: NOW });
  });
  it("refuses a draft", async () => {
    const db = fakeDb(draft);
    await expect(updateLive(db as any, tables, { id: "inv-1", expectedVersion: 4 }, NOW)).rejects.toMatchObject({ name: "NotPublished" });
  });
});

describe("regenerateToken", () => {
  it("stores and returns a fresh 22-char token", async () => {
    const db = fakeDb(draft);
    const { previewToken } = await regenerateToken(db as any, tables, { id: "inv-1" });
    expect(previewToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const upd = db.calls.find((c) => c.constructor.name === "UpdateCommand").input;
    expect(upd.ExpressionAttributeValues[":t"]).toBe(previewToken);
    expect(upd.ConditionExpression).toBe("attribute_exists(id)");
  });
});

it("PublishError carries its name as the GraphQL errorType", () => {
  expect(new PublishError("SlugTaken", "x").name).toBe("SlugTaken");
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run amplify/functions/invitation-publish`
Expected: FAIL — `./publish` not found.

- [ ] **Step 4: Implement the Lambda**

`amplify/functions/invitation-publish/publish.ts`:
```ts
import { randomBytes } from "node:crypto";
import { GetCommand, TransactWriteCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type Tables = { invitation: string; slug: string };
type Db = Pick<DynamoDBDocumentClient, "send">;

// AppSync reports a Lambda error's `name` as its errorType, which the website maps to a message.
export class PublishError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

// Same rules as src/InvitationModule/lib/slug.js validateSlug (kept here because Lambdas can't import src/).
const RESERVED = ["new", "preview", "admin", "api"];
export function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length >= 3 &&
    slug.length <= 60 &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED.includes(slug)
  );
}

async function load(db: Db, tables: Tables, id: string) {
  const { Item } = await db.send(new GetCommand({ TableName: tables.invitation, Key: { id } }));
  if (!Item) throw new PublishError("NotFound", "That invitation no longer exists.");
  return Item as { id: string; status: string; version: number; slug?: string | null; content: unknown };
}

const isConditionFailure = (err: any) => err?.name === "ConditionalCheckFailedException";

export async function setSlug(db: Db, tables: Tables, { id, slug }: { id: string; slug: string }, now: string) {
  if (!isValidSlug(slug)) throw new PublishError("InvalidSlug", "That link name isn't allowed.");
  const inv = await load(db, tables, id);
  if (inv.status !== "draft") throw new PublishError("NotDraft", "The link name is locked after publishing.");
  if (inv.slug === slug) return { slug };

  const items: any[] = [
    {
      Put: {
        TableName: tables.slug,
        Item: { slug, invitationId: id, __typename: "InvitationSlug", createdAt: now, updatedAt: now },
        ConditionExpression: "attribute_not_exists(slug)",
      },
    },
    {
      Update: {
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: "SET slug = :slug",
        ConditionExpression: "#status = :draft AND (attribute_not_exists(slug) OR slug = :old OR slug = :null)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":slug": slug, ":draft": "draft", ":old": inv.slug ?? null, ":null": null },
      },
    },
  ];
  if (inv.slug) {
    items.push({
      Delete: {
        TableName: tables.slug,
        Key: { slug: inv.slug },
        ConditionExpression: "invitationId = :id",
        ExpressionAttributeValues: { ":id": id },
      },
    });
  }
  try {
    await db.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (err: any) {
    if (err?.name === "TransactionCanceledException") {
      const reasons = err.CancellationReasons ?? [];
      if (reasons[0]?.Code === "ConditionalCheckFailed") throw new PublishError("SlugTaken", "That link name is already taken.");
      throw new PublishError("NotDraft", "The invitation changed — reload and try again.");
    }
    throw err;
  }
  return { slug };
}

async function goLive(db: Db, tables: Tables, id: string, expectedVersion: number, now: string, first: boolean) {
  const inv = await load(db, tables, id);
  if (first && inv.status !== "draft") throw new PublishError("NotDraft", "This invitation is already published.");
  if (!first && inv.status !== "published") throw new PublishError("NotPublished", "Publish the invitation first.");
  if (first && !inv.slug) throw new PublishError("NoSlug", "Choose a link name first.");
  if (inv.version !== expectedVersion) throw new PublishError("VersionConflict", "Updated by someone else — reload");

  const set = first
    ? "SET publishedContent = :content, liveVersion = :v, #status = :published, publishedAt = :now, liveUpdatedAt = :now"
    : "SET publishedContent = :content, liveVersion = :v, liveUpdatedAt = :now";
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: set,
        ConditionExpression: `version = :v AND #status = ${first ? ":draft" : ":published"}`,
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":content": inv.content,
          ":v": expectedVersion,
          ":now": now,
          ":published": "published",
          ...(first ? { ":draft": "draft" } : {}),
        },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw new PublishError("VersionConflict", "Updated by someone else — reload");
    throw err;
  }
  return first
    ? { status: "published", liveVersion: expectedVersion, publishedAt: now, liveUpdatedAt: now }
    : { liveVersion: expectedVersion, liveUpdatedAt: now };
}

export const publish = (db: Db, t: Tables, a: { id: string; expectedVersion: number }, now: string) =>
  goLive(db, t, a.id, a.expectedVersion, now, true);
export const updateLive = (db: Db, t: Tables, a: { id: string; expectedVersion: number }, now: string) =>
  goLive(db, t, a.id, a.expectedVersion, now, false);

export async function regenerateToken(db: Db, tables: Tables, { id }: { id: string }) {
  const previewToken = randomBytes(16).toString("base64url");
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id },
        UpdateExpression: "SET previewToken = :t",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: { ":t": previewToken },
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) throw new PublishError("NotFound", "That invitation no longer exists.");
    throw err;
  }
  return { previewToken };
}
```

Note the `fakeDb` in the test signals "save landed between read and write" with `failTransact: -1`, which makes `UpdateCommand` throw `ConditionalCheckFailedException`.

`amplify/functions/invitation-publish/handler.ts`:
```ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { publish, PublishError, regenerateToken, setSlug, updateLive } from "./publish";

type Event = { fieldName: string; arguments: Record<string, any>; identity: { groups?: string[] | null } | null };

const db = DynamoDBDocumentClient.from(new DynamoDBClient());
const tables = { invitation: process.env.INVITATION_TABLE ?? "", slug: process.env.INVITATION_SLUG_TABLE ?? "" };

export const handler = async (event: Event) => {
  // AppSync already limits these operations to staff; this is the second lock.
  if (!event.identity?.groups?.includes("admin")) throw new PublishError("Forbidden", "Staff only.");
  const now = new Date().toISOString();
  const a = event.arguments;
  try {
    switch (event.fieldName) {
      case "setInvitationSlug":
        return await setSlug(db, tables, { id: a.id, slug: a.slug }, now);
      case "publishInvitation":
        return await publish(db, tables, { id: a.id, expectedVersion: a.expectedVersion }, now);
      case "updateLiveInvitation":
        return await updateLive(db, tables, { id: a.id, expectedVersion: a.expectedVersion }, now);
      case "regeneratePreviewToken":
        return await regenerateToken(db, tables, { id: a.id });
      default:
        throw new PublishError("Unknown", `Unknown operation ${event.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof PublishError) throw err;
    console.error("invitation-publish failed", event.fieldName, err);
    throw new Error("Something went wrong. Please try again.");
  }
};
```

`amplify/functions/invitation-publish/resource.ts`:
```ts
import { defineFunction } from "@aws-amplify/backend";

export const invitationPublish = defineFunction({
  name: "invitation-publish",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  // Called by the data API and reads its tables: keep it in the data stack to avoid a circular dependency.
  resourceGroupName: "data",
});
```

- [ ] **Step 5: Write the failing resolver tests**

`amplify/data/publicInvitation.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

const earlyReturn = vi.fn((value: unknown) => {
  throw Object.assign(new Error("early"), { early: true, value });
});
vi.mock("@aws-appsync/utils", () => ({
  runtime: { earlyReturn },
  util: { error: (m: string, t: string) => { throw Object.assign(new Error(m), { type: t }); } },
}));
vi.mock("@aws-appsync/utils/dynamodb", () => ({ get: (input: unknown) => ({ operation: "GetItem", input }) }));

import * as slugStep from "./publicInvitation.slug.js";
import * as invStep from "./publicInvitation.invitation.js";

const ctx = (args: any, extra: any = {}) => ({ args, stash: {}, ...extra }) as any;
const early = (fn: () => unknown) => {
  try {
    fn();
  } catch (e: any) {
    if (e.early) return e.value;
    throw e;
  }
  throw new Error("expected early return");
};

describe("slug step", () => {
  it("looks up the slug", () => {
    expect((slugStep.request(ctx({ slug: "priya-weds-rahul" })) as any).input.key).toEqual({ slug: "priya-weds-rahul" });
  });
  it("returns null straight away for a malformed slug", () => {
    expect(early(() => slugStep.request(ctx({ slug: "../x" })))).toBeNull();
  });
  it("stashes the invitation id, or marks a miss", () => {
    const hit = ctx({ slug: "a-b" }, { result: { invitationId: "inv-1" } });
    slugStep.response(hit);
    expect(hit.stash.invitationId).toBe("inv-1");
    const miss = ctx({ slug: "a-b" }, { result: null });
    slugStep.response(miss);
    expect(miss.stash.invitationId).toBeUndefined();
  });
});

describe("invitation step", () => {
  const item = {
    id: "inv-1", status: "published", templateId: "royal", content: '{"draft":true}', publishedContent: '{"live":true}',
    previewToken: "tok_1234567890abcdefghij", createdBy: "x", updatedBy: "y", searchText: "s", version: 9, liveVersion: 8,
  };
  const run = (stash: any, args: any, result: any) => invStep.response({ args, stash, result } as any);

  it("returns null without a stashed id", () => {
    expect(early(() => invStep.request(ctx({ slug: "a-b" })))).toBeNull();
  });
  it("gets the invitation by id", () => {
    expect((invStep.request({ args: {}, stash: { invitationId: "inv-1" } } as any) as any).input.key).toEqual({ id: "inv-1" });
  });
  it("serves the live copy to everyone", () => {
    expect(run({}, { slug: "a-b" }, item)).toEqual({ mode: "live", templateId: "royal", content: '{"live":true}' });
  });
  it("serves the draft for the right preview token", () => {
    expect(run({}, { slug: "a-b", previewToken: item.previewToken }, item)).toEqual({
      mode: "preview", templateId: "royal", content: '{"draft":true}',
    });
  });
  it("ignores a wrong or empty token", () => {
    expect(run({}, { slug: "a-b", previewToken: "nope" }, item)!.mode).toBe("live");
    expect(run({}, { slug: "a-b", previewToken: "" }, { ...item, previewToken: "" })!.mode).toBe("live");
  });
  it("hides drafts without the token", () => {
    expect(run({}, { slug: "a-b" }, { ...item, status: "draft", publishedContent: null })).toBeNull();
  });
  it("hides any other status", () => {
    expect(run({}, { slug: "a-b" }, { ...item, status: "deleted" })).toBeNull();
    expect(run({}, { slug: "a-b", previewToken: item.previewToken }, { ...item, status: "deleted" })).toBeNull();
  });
  it("returns null for a missing item", () => {
    expect(run({}, { slug: "a-b" }, null)).toBeNull();
  });
  it("never returns bookkeeping fields", () => {
    expect(Object.keys(run({}, { slug: "a-b" }, item)!)).toEqual(["mode", "templateId", "content"]);
  });
});
```

- [ ] **Step 6: Implement the resolvers**

`amplify/data/publicInvitation.slug.js`:
```js
import { runtime } from "@aws-appsync/utils";
import * as ddb from "@aws-appsync/utils/dynamodb";

// Step 1 of the public lookup: link name → invitation id. Malformed names never reach the database.
export function request(ctx) {
  const slug = ctx.args.slug;
  if (typeof slug !== "string" || slug.length < 3 || slug.length > 60 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    runtime.earlyReturn(null);
  }
  return ddb.get({ key: { slug } });
}

export function response(ctx) {
  if (ctx.result && ctx.result.invitationId) ctx.stash.invitationId = ctx.result.invitationId;
  return null;
}
```

`amplify/data/publicInvitation.invitation.js`:
```js
import { runtime } from "@aws-appsync/utils";
import * as ddb from "@aws-appsync/utils/dynamodb";

// Step 2: load the invitation and return only what guests may see.
export function request(ctx) {
  if (!ctx.stash.invitationId) runtime.earlyReturn(null);
  return ddb.get({ key: { id: ctx.stash.invitationId } });
}

export function response(ctx) {
  const item = ctx.result;
  if (!item) return null;
  const token = ctx.args.previewToken;
  const tokenOk = typeof token === "string" && token !== "" && typeof item.previewToken === "string" && token === item.previewToken;
  if ((item.status === "draft" || item.status === "published") && tokenOk) {
    return { mode: "preview", templateId: item.templateId, content: item.content };
  }
  if (item.status === "published" && item.publishedContent) {
    return { mode: "live", templateId: item.templateId, content: item.publishedContent };
  }
  return null;
}
```

`amplify/data/publicInvitation.d.ts`:
```ts
// Types for the AppSync JS resolvers so tests can import them under strict tsc.
export function request(ctx: unknown): unknown;
export function response(ctx: unknown): { mode: string; templateId: string; content: unknown } | null;
```
(Put this file next to each resolver as `publicInvitation.slug.d.ts` and `publicInvitation.invitation.d.ts` — same content — so each `.js` has its declaration, matching `saveInvitation.d.ts`.)

- [ ] **Step 7: Schema and wiring**

In `amplify/data/resource.ts`: import `invitationPublish` from `../functions/invitation-publish/resource`; add to the `Invitation` model fields:
```ts
      slug: a.string(),
      previewToken: a.string(),
      publishedContent: a.json(),
      liveVersion: a.integer(),
      publishedAt: a.datetime(),
      liveUpdatedAt: a.datetime(),
```
and add to the schema:
```ts
  InvitationSlug: a
    .model({ slug: a.string().required(), invitationId: a.string().required() })
    .identifier(["slug"])
    // Written only by invitation-publish; staff read it to check whether a link name is free.
    .authorization((allow) => [allow.group("admin").to(["read"])]),

  setInvitationSlug: a
    .mutation()
    .arguments({ id: a.id().required(), slug: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  regeneratePreviewToken: a
    .mutation()
    .arguments({ id: a.id().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  publishInvitation: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  updateLiveInvitation: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  PublicInvitation: a.customType({
    mode: a.string().required(),
    templateId: a.string().required(),
    content: a.json().required(),
  }),

  // The only thing guests (no login) can call. It enforces every visibility rule itself.
  publicInvitation: a
    .query()
    .arguments({ slug: a.string().required(), previewToken: a.string() })
    .returns(a.ref("PublicInvitation"))
    .authorization((allow) => [allow.guest()])
    .handler([
      a.handler.custom({ dataSource: a.ref("InvitationSlug"), entry: "./publicInvitation.slug.js" }),
      a.handler.custom({ dataSource: a.ref("Invitation"), entry: "./publicInvitation.invitation.js" }),
    ]),
```
Keep `Invitation`'s authorization as is (staff create/read; `allow.guest()` must NOT be added to the model).

In `amplify/backend.ts`: import `invitationPublish`, add it to `defineBackend({ auth, data, staffAdmin, storage, invitationPublish })`, then:
```ts
// invitation-publish writes link names and live copies directly, in one transaction across both tables.
const tables = backend.data.resources.tables;
for (const name of ["Invitation", "InvitationSlug"]) {
  tables[name].grantReadWriteData(backend.invitationPublish.resources.lambda);
}
backend.invitationPublish.addEnvironment("INVITATION_TABLE", tables["Invitation"].tableName);
backend.invitationPublish.addEnvironment("INVITATION_SLUG_TABLE", tables["InvitationSlug"].tableName);
```

- [ ] **Step 8: Run tests and type check**

Run: `npx vitest run amplify && npx tsc --noEmit -p amplify`
Expected: PASS, tsc exit 0.

- [ ] **Step 9: Deploy to the sandbox and probe**

Run (background, ~5 min): `npx ampx sandbox --once`
Then check the generated `amplify_outputs.json` has `data.model_introspection.queries.publicInvitation` and `auth.unauthenticated_identities_enabled: true`. Gen 2 enables guest identities by default; if `unauthenticated_identities_enabled` is false, stop and report it rather than guessing a fix.
Expected: deploy succeeds.

- [ ] **Step 10: Commit**

```bash
git add amplify package.json package-lock.json
git commit -m "feat(backend): link names, publish/update-live Lambda and public invitation lookup"
```

---

### Task 3: Server layer — staff publish actions and the public lookup

**Files:**
- Modify: `src/AdminModule/invitations/data.js`, `src/AdminModule/invitations/content.js` (+ tests)
- Create: `src/AdminModule/invitations/publishing.js`, `publishing.test.js` (error mapping, pure)
- Create: `src/AdminModule/invitations/publishActions.js`, `publishActions.test.js`
- Create: `src/InvitationModule/server/publicInvitation.js`, `publicInvitation.test.js`
- Modify: `src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js` (ensure a preview token, pass new fields)

**Interfaces:**
- Consumes: Task 1 `validateSlug`, `generateSlug`; Task 2 GraphQL operations; existing `publishChecklist`, `cleanDraft`, `previewInvitation`, `parseInvitation`, `getTemplate`, `requireStaff`, `cookieDataClient`, `outputs`/`runWithAmplifyServerContext`.
- Produces:
  - `getInvitation(id)` now returns `{ id, version, updatedAt, status, slug, previewToken, liveVersion, publishedAt, liveUpdatedAt, content, publishedContent }` (`publishedContent` parsed with `parseContent`, or `null`).
  - `LIST_FIELDS` adds `slug`, `version`, `liveVersion`.
  - `createInvitationRecord` stores `previewToken: randomBytes(16).toString("base64url")`.
  - data functions: `slugOwner(slug) → invitationId | null`, `setSlugRecord({ id, slug })`, `regenerateTokenRecord(id)`, `publishRecord({ id, expectedVersion })`, `updateLiveRecord({ id, expectedVersion })` — each returns `{ data, errors }` from the mutation, `data` parsed with `parseContent`.
  - `publishing.js`: `publishFailure(errors) → { ok: false, conflict: true } | { ok: false, message }`, `PUBLISH_FAILED = "Couldn't publish. Check your connection and try again."`
  - `publishActions.js` ("use server"):
    - `checkSlugAction({ id, slug }) → { status: "available" | "taken" | "invalid", message? }`
    - `setSlugAction({ id, slug }) → { ok: true, slug } | { ok: false, message }`
    - `newPreviewLinkAction({ id }) → { ok: true, previewToken } | { ok: false, message }`
    - `publishAction({ id, expectedVersion, slug }) → { ok: true, status, slug, liveVersion, publishedAt, liveUpdatedAt } | { ok: false, conflict? , message?, missing? }`
    - `updateLiveAction({ id, expectedVersion }) → { ok: true, liveVersion, liveUpdatedAt } | { ok: false, conflict?, message?, missing? }`
  - `getPublicInvitation(slug, previewToken?) → null | { mode: "live" | "preview", invitation }` (React `cache`d per request; throws on backend failure).

- [ ] **Step 1: Error mapping (test first)**

`src/AdminModule/invitations/publishing.test.js`:
```js
import { describe, expect, it } from "vitest";
import { PUBLISH_FAILED, publishFailure } from "./publishing";

describe("publishFailure", () => {
  it("treats a version conflict as a conflict", () => {
    expect(publishFailure([{ errorType: "VersionConflict" }])).toEqual({ ok: false, conflict: true });
  });
  it.each([
    ["SlugTaken", "That link name was just taken — try another."],
    ["InvalidSlug", "That link name isn't allowed."],
    ["NotDraft", "This invitation is already published — reload the page."],
    ["NotPublished", "Publish the invitation first."],
    ["NoSlug", "Choose a link name first."],
    ["NotFound", "That invitation no longer exists."],
  ])("maps %s", (type, message) => expect(publishFailure([{ errorType: type }])).toEqual({ ok: false, message }));
  it("falls back to the connection message", () => {
    expect(publishFailure([{ errorType: "Lambda:Unhandled" }])).toEqual({ ok: false, message: PUBLISH_FAILED });
    expect(publishFailure(undefined)).toEqual({ ok: false, message: PUBLISH_FAILED });
  });
});
```

`src/AdminModule/invitations/publishing.js`:
```js
export const PUBLISH_FAILED = "Couldn't publish. Check your connection and try again.";

const MESSAGES = {
  SlugTaken: "That link name was just taken — try another.",
  InvalidSlug: "That link name isn't allowed.",
  NotDraft: "This invitation is already published — reload the page.",
  NotPublished: "Publish the invitation first.",
  NoSlug: "Choose a link name first.",
  NotFound: "That invitation no longer exists.",
};

/** Turns a GraphQL error list from invitation-publish into what the editor shows. */
export function publishFailure(errors) {
  const type = errors?.[0]?.errorType;
  if (type === "VersionConflict") return { ok: false, conflict: true };
  return { ok: false, message: MESSAGES[type] ?? PUBLISH_FAILED };
}
```

Run `npx vitest run src/AdminModule/invitations/publishing.test.js` → PASS after implementing.

- [ ] **Step 2: Data layer**

In `src/AdminModule/invitations/data.js`:
- `import { randomBytes } from "node:crypto";`
- `LIST_FIELDS` → add `"slug", "version", "liveVersion"`.
- `getInvitation` returns the new fields:
```js
  return {
    id: data.id,
    version: data.version,
    updatedAt: data.updatedAt,
    status: data.status,
    slug: data.slug ?? null,
    previewToken: data.previewToken ?? null,
    liveVersion: data.liveVersion ?? null,
    publishedAt: data.publishedAt ?? null,
    liveUpdatedAt: data.liveUpdatedAt ?? null,
    content: parseContent(data.content),
    publishedContent: data.publishedContent ? parseContent(data.publishedContent) : null,
  };
```
- `createInvitationRecord` adds `previewToken: randomBytes(16).toString("base64url"),`.
- Add:
```js
/** Which invitation owns a link name, or null when it's free. */
export async function slugOwner(slug) {
  const { data, errors } = await cookieDataClient().models.InvitationSlug.get({ slug });
  failIfErrors(errors);
  return data?.invitationId ?? null;
}

async function mutate(name, args) {
  const { data, errors } = await cookieDataClient().mutations[name](args);
  return { data: data == null ? null : parseContent(data), errors };
}

export const setSlugRecord = ({ id, slug }) => mutate("setInvitationSlug", { id, slug });
export const regenerateTokenRecord = (id) => mutate("regeneratePreviewToken", { id });
export const publishRecord = ({ id, expectedVersion }) => mutate("publishInvitation", { id, expectedVersion });
export const updateLiveRecord = ({ id, expectedVersion }) => mutate("updateLiveInvitation", { id, expectedVersion });
```
Update the existing `data` tests (if any assert `LIST_FIELDS` or `getInvitation`'s shape) to the new shape.

- [ ] **Step 3: Actions (test first)**

`src/AdminModule/invitations/publishActions.test.js` — mock `@/AdminModule/auth/server` (`requireStaff` resolves `{ email: "s@x.com" }`), `next/cache` (`revalidatePath: vi.fn()`) and `./data` (all functions `vi.fn()`), then:
```js
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/AdminModule/auth/server", () => ({ requireStaff: vi.fn(async () => ({ email: "s@x.com" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const data = vi.hoisted(() => ({
  getInvitation: vi.fn(), slugOwner: vi.fn(), setSlugRecord: vi.fn(), regenerateTokenRecord: vi.fn(),
  publishRecord: vi.fn(), updateLiveRecord: vi.fn(),
}));
vi.mock("./data", () => data);

import { checkSlugAction, newPreviewLinkAction, publishAction, setSlugAction, updateLiveAction } from "./publishActions";

const ready = {
  templateId: "minimal", theme: { palette: "ivory" }, language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14", venue: { name: { en: "Rambagh" }, address: { en: "Jaipur" } }, events: [],
};
const inv = (over = {}) => ({ id: "inv-1", version: 4, status: "draft", slug: "priya-weds-rahul-k3f9", content: ready, ...over });

beforeEach(() => vi.clearAllMocks());

describe("checkSlugAction", () => {
  it("rejects invalid names without a lookup", async () => {
    expect(await checkSlugAction({ id: "inv-1", slug: "Bad" })).toEqual({ status: "invalid", message: "Use only lowercase letters, numbers and dashes." });
    expect(data.slugOwner).not.toHaveBeenCalled();
  });
  it("is available when free or already ours", async () => {
    data.slugOwner.mockResolvedValueOnce(null).mockResolvedValueOnce("inv-1");
    expect((await checkSlugAction({ id: "inv-1", slug: "free-name" })).status).toBe("available");
    expect((await checkSlugAction({ id: "inv-1", slug: "our-name" })).status).toBe("available");
  });
  it("is taken when another invitation owns it", async () => {
    data.slugOwner.mockResolvedValue("inv-2");
    expect((await checkSlugAction({ id: "inv-1", slug: "their-name" })).status).toBe("taken");
  });
});

describe("publishAction", () => {
  it("refuses when the checklist fails, listing what's missing", async () => {
    data.getInvitation.mockResolvedValue(inv({ content: { ...ready, mainDate: undefined } }));
    const r = await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-weds-rahul-k3f9" });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("Add the wedding date");
    expect(data.publishRecord).not.toHaveBeenCalled();
  });
  it("is a conflict when the stored version moved on", async () => {
    data.getInvitation.mockResolvedValue(inv({ version: 5 }));
    expect(await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-weds-rahul-k3f9" })).toEqual({ ok: false, conflict: true });
  });
  it("saves a changed link name first, then publishes", async () => {
    data.getInvitation.mockResolvedValue(inv());
    data.setSlugRecord.mockResolvedValue({ data: { slug: "priya-rahul" } });
    data.publishRecord.mockResolvedValue({ data: { status: "published", liveVersion: 4, publishedAt: "t", liveUpdatedAt: "t" } });
    const r = await publishAction({ id: "inv-1", expectedVersion: 4, slug: "priya-rahul" });
    expect(data.setSlugRecord).toHaveBeenCalledWith({ id: "inv-1", slug: "priya-rahul" });
    expect(r).toEqual({ ok: true, status: "published", slug: "priya-rahul", liveVersion: 4, publishedAt: "t", liveUpdatedAt: "t" });
  });
  it("maps a taken slug", async () => {
    data.getInvitation.mockResolvedValue(inv());
    data.setSlugRecord.mockResolvedValue({ errors: [{ errorType: "SlugTaken" }] });
    expect(await publishAction({ id: "inv-1", expectedVersion: 4, slug: "taken" })).toEqual({
      ok: false, message: "That link name was just taken — try another.",
    });
  });
});

describe("updateLiveAction", () => {
  it("pushes live after the checklist passes", async () => {
    data.getInvitation.mockResolvedValue(inv({ status: "published", version: 9 }));
    data.updateLiveRecord.mockResolvedValue({ data: { liveVersion: 9, liveUpdatedAt: "t" } });
    expect(await updateLiveAction({ id: "inv-1", expectedVersion: 9 })).toEqual({ ok: true, liveVersion: 9, liveUpdatedAt: "t" });
  });
});

describe("newPreviewLinkAction", () => {
  it("returns the new token", async () => {
    data.regenerateTokenRecord.mockResolvedValue({ data: { previewToken: "abc" } });
    expect(await newPreviewLinkAction({ id: "inv-1" })).toEqual({ ok: true, previewToken: "abc" });
  });
});

describe("setSlugAction", () => {
  it("validates before saving", async () => {
    expect(await setSlugAction({ id: "inv-1", slug: "ab" })).toEqual({ ok: false, message: "Use 3 to 60 characters." });
  });
});
```
Use a palette id that exists for `minimal` (check `src/InvitationModule/templates/minimal/palettes.js`) and adjust `ready` until `publishChecklist(cleanDraft(ready).draft)` is empty — the "missing" test relies on it.

`src/AdminModule/invitations/publishActions.js`:
```js
"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { validateSlug } from "@/InvitationModule/lib/slug";
import { getInvitation, publishRecord, regenerateTokenRecord, setSlugRecord, slugOwner, updateLiveRecord } from "./data";
import { PUBLISH_FAILED, publishFailure } from "./publishing";

function refresh(id) {
  revalidatePath(`/admin/invitations/${id}/edit`);
  revalidatePath("/admin/invitations");
}

async function attempt(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("publish action failed", err);
    return { ok: false, message: PUBLISH_FAILED };
  }
}

export async function checkSlugAction({ id, slug }) {
  await requireStaff();
  const invalid = validateSlug(slug);
  if (invalid) return { status: "invalid", message: invalid };
  return attempt(async () => {
    const owner = await slugOwner(slug);
    return owner && owner !== id ? { status: "taken", message: "Already taken — try another." } : { status: "available" };
  });
}

export async function setSlugAction({ id, slug }) {
  await requireStaff();
  const invalid = validateSlug(slug);
  if (invalid) return { ok: false, message: invalid };
  return attempt(async () => {
    const { data, errors } = await setSlugRecord({ id, slug });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, slug: data.slug };
  });
}

export async function newPreviewLinkAction({ id }) {
  await requireStaff();
  return attempt(async () => {
    const { data, errors } = await regenerateTokenRecord(id);
    if (errors?.length || !data) return publishFailure(errors);
    return { ok: true, previewToken: data.previewToken };
  });
}

/** Re-reads the stored draft and runs the publish checklist on exactly the version being published. */
async function approved(id, expectedVersion) {
  const inv = await getInvitation(id);
  if (!inv) return { stop: { ok: false, message: "That invitation no longer exists." } };
  if (inv.version !== expectedVersion) return { stop: { ok: false, conflict: true } };
  const missing = publishChecklist(cleanDraft(inv.content).draft ?? {}).map((item) => item.message);
  if (missing.length) return { stop: { ok: false, message: "Some details are still missing.", missing } };
  return { inv };
}

export async function publishAction({ id, expectedVersion, slug }) {
  await requireStaff();
  return attempt(async () => {
    const { stop, inv } = await approved(id, expectedVersion);
    if (stop) return stop;
    let finalSlug = inv.slug;
    if (slug && slug !== inv.slug) {
      const invalid = validateSlug(slug);
      if (invalid) return { ok: false, message: invalid };
      const set = await setSlugRecord({ id, slug });
      if (set.errors?.length || !set.data) return publishFailure(set.errors);
      finalSlug = set.data.slug;
    }
    const { data, errors } = await publishRecord({ id, expectedVersion });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, status: data.status, slug: finalSlug, liveVersion: data.liveVersion, publishedAt: data.publishedAt, liveUpdatedAt: data.liveUpdatedAt };
  });
}

export async function updateLiveAction({ id, expectedVersion }) {
  await requireStaff();
  return attempt(async () => {
    const { stop } = await approved(id, expectedVersion);
    if (stop) return stop;
    const { data, errors } = await updateLiveRecord({ id, expectedVersion });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, liveVersion: data.liveVersion, liveUpdatedAt: data.liveUpdatedAt };
  });
}
```

Run: `npx vitest run src/AdminModule/invitations` → PASS.

- [ ] **Step 4: Public lookup (test first)**

`src/InvitationModule/server/publicInvitation.test.js` — mock `@aws-amplify/adapter-nextjs/data` (`generateServerClientUsingReqRes` returns `{ queries: { publicInvitation: query } }`) and `@/AdminModule/auth/amplifyServer` (`outputs: {}`, `runWithAmplifyServerContext: ({ operation }) => operation({})`). Tests:
```js
import { describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@aws-amplify/adapter-nextjs/data", () => ({ generateServerClientUsingReqRes: () => ({ queries: { publicInvitation: query } }) }));
vi.mock("@/AdminModule/auth/amplifyServer", () => ({ outputs: {}, runWithAmplifyServerContext: ({ operation }) => operation({}) }));
vi.mock("react", async (orig) => ({ ...(await orig()), cache: (fn) => fn }));

import { minimalSample } from "@/InvitationModule/templates/minimal/sample";
import { loadPublicInvitation } from "./publicInvitation";

describe("loadPublicInvitation", () => {
  it("returns null when nothing is visible", async () => {
    query.mockResolvedValue({ data: null });
    expect(await loadPublicInvitation("a-b")).toBeNull();
  });
  it("passes the preview token only when it's a non-empty string", async () => {
    query.mockResolvedValue({ data: null });
    await loadPublicInvitation("a-b", ["x", "y"]);
    expect(query).toHaveBeenLastCalledWith({}, { slug: "a-b" });
    await loadPublicInvitation("a-b", "tok");
    expect(query).toHaveBeenLastCalledWith({}, { slug: "a-b", previewToken: "tok" });
  });
  it("parses the live copy and switches RSVP off until Phase 4", async () => {
    const live = { ...minimalSample, rsvp: { ...minimalSample.rsvp, enabled: true } };
    query.mockResolvedValue({ data: { mode: "live", templateId: "minimal", content: JSON.stringify(live) } });
    const r = await loadPublicInvitation("a-b");
    expect(r.mode).toBe("live");
    expect(r.invitation.couple.bride.name).toEqual(live.couple.bride.name);
    expect(r.invitation.rsvp.enabled).toBe(false);
  });
  it("renders a preview from the draft", async () => {
    query.mockResolvedValue({ data: { mode: "preview", templateId: "minimal", content: JSON.stringify({ templateId: "minimal", theme: { palette: minimalSample.theme.palette }, language: "en" }) } });
    const r = await loadPublicInvitation("a-b", "tok");
    expect(r.mode).toBe("preview");
    expect(r.invitation.templateId).toBe("minimal");
  });
  it("throws on a backend error so the page shows 'try again', not 'no longer available'", async () => {
    query.mockResolvedValue({ data: null, errors: [{ message: "boom" }] });
    await expect(loadPublicInvitation("a-b")).rejects.toThrow("boom");
  });
});
```

`src/InvitationModule/server/publicInvitation.js`:
```js
import { cache } from "react";
import { generateServerClientUsingReqRes } from "@aws-amplify/adapter-nextjs/data";
import { outputs, runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { parseContent } from "@/AdminModule/invitations/content";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { parseInvitation } from "@/InvitationModule/schema/invitation";
import { previewInvitation } from "@/InvitationModule/lib/preview";
import { getTemplate } from "@/InvitationModule/templates/registry";

// Guests have no login: the identity pool's guest role may call publicInvitation and nothing else.
const client = generateServerClientUsingReqRes({ config: outputs, authMode: "identityPool" });

export async function loadPublicInvitation(slug, previewToken) {
  const args = typeof previewToken === "string" && previewToken ? { slug, previewToken } : { slug };
  const { data, errors } = await runWithAmplifyServerContext({
    nextServerContext: null,
    operation: (ctx) => client.queries.publicInvitation(ctx, args),
  });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data) return null;

  const content = parseContent(data.content);
  const template = getTemplate(data.templateId);
  if (!template) return null;
  if (data.mode === "preview") {
    return { mode: "preview", invitation: previewInvitation(cleanDraft(content).draft, template).invitation };
  }
  const invitation = parseInvitation({ ...content, templateId: data.templateId });
  // RSVPs are stored from Phase 4; until then a live form would silently drop answers.
  return { mode: "live", invitation: { ...invitation, rsvp: { ...invitation.rsvp, enabled: false } } };
}

/** One lookup per request, shared by generateMetadata and the page. */
export const getPublicInvitation = cache(loadPublicInvitation);
```
If `parseInvitation` throws on a malformed live copy, the error propagates to `error.js` (Task 4) — correct: it is a fault, not "no longer available".

- [ ] **Step 5: Edit page — ensure a preview token, pass new fields**

In `src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js`, after `getInvitation`:
```js
  // Invitations created before Phase 3 have no preview code yet.
  if (!invitation.previewToken) {
    const { data } = await regenerateTokenRecord(invitation.id).catch(() => ({ data: null }));
    invitation.previewToken = data?.previewToken ?? null;
  }
```
and pass `publishActions={{ checkSlugAction, setSlugAction, newPreviewLinkAction, publishAction, updateLiveAction }}` to `EditorShell` (imported from `@/AdminModule/invitations/publishActions`). `EditorShell` consumes it in Task 6.

- [ ] **Step 6: Run all tests, commit**

Run: `npm test` → all pass.
```bash
git add src/AdminModule/invitations src/InvitationModule/server "src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js"
git commit -m "feat(invitations): publish actions and the public invitation lookup"
```

---

### Task 4: The public page

**Files:**
- Create: `src/app/(invite)/invitation/[slug]/page.js`, `not-found.js`, `error.js`
- Create: `src/InvitationModule/public/PreviewBanner.jsx`, `src/InvitationModule/public/NotAvailable.jsx`, `src/InvitationModule/public/public.test.jsx`
- Create: `src/InvitationModule/lib/ogText.js`, `src/InvitationModule/lib/ogText.test.js`

**Interfaces:**
- Consumes: `getPublicInvitation` (Task 3), `InvitationRenderer`, `coupleTitle`, `formatDate`, `textFor`.
- Produces: `ogTitle(invitation) → string`, `ogDescription(invitation) → string`, `PREVIEW_TITLE = "Wedding invitation preview"`; route `/invitation/[slug]` with metadata `openGraph.images` pointing at `/invitation/<slug>/card` (live) or `/api/og/invitation-preview` (preview) — both built in Task 5.

- [ ] **Step 1: OG text (test first)**

`src/InvitationModule/lib/ogText.test.js`:
```js
import { describe, expect, it } from "vitest";
import { ogDescription, ogTitle } from "./ogText";

const inv = (language) => ({
  language,
  couple: { bride: { name: { en: "Priya", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Rambagh Palace", hi: "रामबाग पैलेस" } },
});

describe("ogTitle", () => {
  it("is English for en and both", () => {
    expect(ogTitle(inv("en"))).toBe("Priya & Rahul are getting married");
    expect(ogTitle(inv("both"))).toBe("Priya & Rahul are getting married");
  });
  it("is Hindi for hi", () => expect(ogTitle(inv("hi"))).toBe("प्रिया और राहुल का शुभ विवाह"));
});

describe("ogDescription", () => {
  it("joins the long date and venue", () => {
    expect(ogDescription(inv("en"))).toBe("Sunday, 14 February 2027 · Rambagh Palace");
  });
  it("omits a missing venue", () => {
    expect(ogDescription({ ...inv("en"), venue: { name: {} } })).toBe("Sunday, 14 February 2027");
  });
});
```
(If `formatDate`'s exact output differs, e.g. "Sunday 14 February 2027", match the test to `formatDate("2027-02-14", "en")` — the description must use `formatDate`, not a new formatter.)

`src/InvitationModule/lib/ogText.js`:
```js
import { formatDate } from "./datetime";
import { textFor } from "./i18n";

export const PREVIEW_TITLE = "Wedding invitation preview";

const lang = (inv) => (inv.language === "hi" ? "hi" : "en");

export function ogTitle(inv) {
  const l = lang(inv);
  const bride = textFor(inv.couple.bride.name, l);
  const groom = textFor(inv.couple.groom.name, l);
  return l === "hi" ? `${bride} और ${groom} का शुभ विवाह` : `${bride} & ${groom} are getting married`;
}

export function ogDescription(inv) {
  const l = lang(inv);
  return [formatDate(inv.mainDate, l), textFor(inv.venue?.name, l)].filter(Boolean).join(" · ");
}
```
(Check `textFor`'s fallback behaviour in `lib/i18n.js`; it must return `""` for an empty object so the venue is omitted.)

- [ ] **Step 2: Banner and not-available components (test first)**

`src/InvitationModule/public/public.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotAvailable from "./NotAvailable";
import PreviewBanner from "./PreviewBanner";

describe("PreviewBanner", () => {
  it("says it is a preview", () => {
    render(<PreviewBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("Preview — not published yet");
  });
});

describe("NotAvailable", () => {
  it("shows the calm message and nothing else about the invitation", () => {
    render(<NotAvailable />);
    expect(screen.getByRole("heading")).toHaveTextContent("This invitation is no longer available");
  });
});
```

`src/InvitationModule/public/PreviewBanner.jsx`:
```jsx
export default function PreviewBanner() {
  return (
    <div role="status" className="sticky top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 shadow">
      Preview — not published yet
    </div>
  );
}
```

`src/InvitationModule/public/NotAvailable.jsx`:
```jsx
export default function NotAvailable({ title = "This invitation is no longer available", detail }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-6 text-center text-stone-800">
      <h1 className="font-serif text-2xl">{title}</h1>
      {detail ? <p className="mt-3 text-sm text-stone-600">{detail}</p> : null}
      <p className="mt-10 text-xs text-stone-500">Baba Saab Events</p>
    </main>
  );
}
```

- [ ] **Step 3: Route files**

`src/app/(invite)/invitation/[slug]/page.js`:
```js
import { notFound } from "next/navigation";
import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import PreviewBanner from "@/InvitationModule/public/PreviewBanner";
import { getPublicInvitation } from "@/InvitationModule/server/publicInvitation";
import { ogDescription, ogTitle, PREVIEW_TITLE } from "@/InvitationModule/lib/ogText";

// Rendered per request (plan ruling R1): Update live shows at once, and a preview visit never touches what guests see.
export const dynamic = "force-dynamic";

const tokenFrom = (searchParams) => (typeof searchParams?.preview === "string" ? searchParams.preview : undefined);

export async function generateMetadata({ params, searchParams }) {
  const result = await getPublicInvitation(params.slug, tokenFrom(searchParams)).catch(() => null);
  const robots = { index: false, follow: false };
  if (!result) return { title: "Invitation", robots };
  if (result.mode === "preview") {
    return { title: PREVIEW_TITLE, robots, openGraph: { title: PREVIEW_TITLE, images: ["/api/og/invitation-preview"] } };
  }
  const title = ogTitle(result.invitation);
  const description = ogDescription(result.invitation);
  const image = `/invitation/${params.slug}/card`;
  return {
    title,
    description,
    robots,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PublicInvitationPage({ params, searchParams }) {
  const result = await getPublicInvitation(params.slug, tokenFrom(searchParams));
  if (!result) notFound();
  return (
    <>
      {result.mode === "preview" ? <PreviewBanner /> : null}
      <InvitationRenderer invitation={result.invitation} ctx={{ mode: result.mode }} />
    </>
  );
}
```
Relative OG URLs need `metadataBase`: in `src/app/(invite)/layout.js` add
```js
import { headers } from "next/headers";
export async function generateMetadata() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { metadataBase: new URL(`${proto}://${host}`), robots: { index: false, follow: false } };
}
```
replacing the static `metadata` export (keep `robots` noindex).

`src/app/(invite)/invitation/[slug]/not-found.js`:
```js
import NotAvailable from "@/InvitationModule/public/NotAvailable";

export default function InvitationNotFound() {
  return <NotAvailable />;
}
```

`src/app/(invite)/invitation/[slug]/error.js`:
```js
"use client";

import NotAvailable from "@/InvitationModule/public/NotAvailable";

export default function InvitationError({ reset }) {
  return (
    <div>
      <NotAvailable title="Couldn't load this invitation — please try again in a minute" />
      <div className="-mt-24 flex justify-center">
        <button type="button" onClick={reset} className="min-h-[44px] rounded-full border border-stone-400 px-5 text-sm">
          Try again
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Share links never carry the preview code**

Add to `src/InvitationModule/lib/share.test.js`:
```js
it("strips the preview code from a preview page's share link", () => {
  expect(shareableUrl("https://www.babasaab.com/invitation/priya-weds-rahul?preview=abc#top")).toBe(
    "https://www.babasaab.com/invitation/priya-weds-rahul",
  );
});
```
Run: `npx vitest run src/InvitationModule` → PASS.

- [ ] **Step 5: Build check and commit**

Run: `npx next build` (stop any dev server first). Expected: success; `/invitation/[slug]` listed as dynamic (ƒ).
```bash
git add "src/app/(invite)" src/InvitationModule/public src/InvitationModule/lib/ogText.js src/InvitationModule/lib/ogText.test.js src/InvitationModule/lib/share.test.js
git commit -m "feat(invite): public invitation page, preview banner and not-available page"
```

---

### Task 5: WhatsApp / Open Graph card images

**Files:**
- Create: `src/InvitationModule/og/cardModel.js`, `src/InvitationModule/og/cardModel.test.js`
- Create: `src/InvitationModule/og/Card.jsx` (satori-safe JSX: inline styles, flex only)
- Create: `src/InvitationModule/og/fonts/` — `playfair-display-latin-600-normal.woff`, `noto-serif-devanagari-devanagari-600-normal.woff`, `OFL.txt`
- Create: `src/InvitationModule/og/fonts.js`
- Create: `src/app/(invite)/invitation/[slug]/card/route.js`, `src/app/api/og/invitation-preview/route.js`
- Modify: `next.config.js` (`experimental.outputFileTracingIncludes`)

**Interfaces:**
- Consumes: `getPublicInvitation`, `getTemplate`, `getPalette`, `mediaUrl`, `coupleTitle`, `formatDate`, `ogTitle`.
- Produces: `cardModel(invitation) → { names, date, coverUrl | null, colors: { bg, text, accent }, lang }`; `GET /invitation/<slug>/card` → 1200×630 PNG of the **live** copy (never the draft; 404 PNG-less response when not live); `GET /api/og/invitation-preview` → generic card.

- [ ] **Step 1: Fonts**

```bash
S="$TEMP/og-fonts" && rm -rf "$S" && mkdir -p "$S" && cd "$S"
npm pack @fontsource/playfair-display@5 @fontsource/noto-serif-devanagari@5
for f in *.tgz; do tar -xzf "$f" && mv package "${f%.tgz}"; done
```
Copy `files/playfair-display-latin-600-normal.woff` and `files/noto-serif-devanagari-devanagari-600-normal.woff` into `src/InvitationModule/og/fonts/`, plus the package `LICENSE` as `OFL.txt`. (satori reads `.woff`, not `.woff2`.)

`src/InvitationModule/og/fonts.js`:
```js
import { readFile } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "src/InvitationModule/og/fonts");
let loaded;

/** Fonts for next/og: a Latin display face and a Devanagari face so Hindi names render. */
export function ogFonts() {
  loaded ??= Promise.all([
    readFile(path.join(dir, "playfair-display-latin-600-normal.woff")),
    readFile(path.join(dir, "noto-serif-devanagari-devanagari-600-normal.woff")),
  ]).then(([latin, deva]) => [
    { name: "Display", data: latin, weight: 600, style: "normal" },
    { name: "Devanagari", data: deva, weight: 600, style: "normal" },
  ]);
  return loaded;
}
```
In `next.config.js` add (merge with the existing `experimental` key if any):
```js
  experimental: {
    // The OG card routes read their font files at runtime; make sure the server bundle includes them.
    outputFileTracingIncludes: {
      "/invitation/[slug]/card": ["./src/InvitationModule/og/fonts/**"],
      "/api/og/invitation-preview": ["./src/InvitationModule/og/fonts/**"],
    },
  },
```

- [ ] **Step 2: Card model (test first)**

`src/InvitationModule/og/cardModel.test.js`:
```js
import { describe, expect, it, vi } from "vitest";
vi.mock("@/InvitationModule/lib/media", () => ({ mediaUrl: (k) => `https://media.example/${k}` }));
import { minimalSample } from "@/InvitationModule/templates/minimal/sample";
import { getPalette, getTemplate } from "@/InvitationModule/templates/registry";
import { cardModel } from "./cardModel";

describe("cardModel", () => {
  const inv = { ...minimalSample, templateId: "minimal" };
  it("uses the palette colours", () => {
    const vars = getPalette(getTemplate("minimal"), inv.theme.palette).vars;
    expect(cardModel(inv).colors).toEqual({ bg: vars["--bg"], text: vars["--text"], accent: vars["--primary"] });
  });
  it("uses the cover photo when there is one", () => {
    expect(cardModel({ ...inv, media: { ...inv.media, coverKey: "invitations/i/c.jpg" } }).coverUrl).toBe("https://media.example/invitations/i/c.jpg");
    expect(cardModel({ ...inv, media: { ...inv.media, coverKey: undefined } }).coverUrl).toBeNull();
  });
  it("uses Hindi names and date for hi invitations", () => {
    const hi = { ...inv, language: "hi", couple: { bride: { name: { hi: "प्रिया" } }, groom: { name: { hi: "राहुल" } } } };
    const m = cardModel(hi);
    expect(m.lang).toBe("hi");
    expect(m.names).toBe("प्रिया & राहुल");
  });
});
```

`src/InvitationModule/og/cardModel.js`:
```js
import { formatDate } from "@/InvitationModule/lib/datetime";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { coupleTitle } from "@/InvitationModule/lib/names";
import { getPalette, getTemplate } from "@/InvitationModule/templates/registry";

/** Everything the share card shows, decided outside the image renderer so it can be tested. */
export function cardModel(invitation) {
  const lang = invitation.language === "hi" ? "hi" : "en";
  const vars = getPalette(getTemplate(invitation.templateId), invitation.theme?.palette).vars;
  const coverKey = invitation.media?.coverKey;
  return {
    lang,
    names: coupleTitle(invitation, lang),
    date: formatDate(invitation.mainDate, lang),
    coverUrl: coverKey ? mediaUrl(coverKey) : null,
    colors: { bg: vars["--bg"], text: vars["--text"], accent: vars["--primary"] },
  };
}
```

- [ ] **Step 3: Card component and routes**

`src/InvitationModule/og/Card.jsx` (satori supports only flexbox and inline styles):
```jsx
export function InvitationCard({ model }) {
  const font = model.lang === "hi" ? "Devanagari" : "Display";
  return (
    <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: model.colors.bg, fontFamily: font }}>
      {model.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={model.coverUrl} width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
      ) : null}
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 64,
          background: model.coverUrl ? "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0) 60%)" : "transparent",
        }}
      >
        <div style={{ fontSize: 76, color: model.coverUrl ? "#ffffff" : model.colors.text, lineHeight: 1.1 }}>{model.names}</div>
        <div style={{ marginTop: 20, fontSize: 36, color: model.coverUrl ? "#f5f5f4" : model.colors.accent }}>{model.date}</div>
      </div>
    </div>
  );
}

export function PreviewCard() {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f5f0e6", fontFamily: "Display" }}>
      <div style={{ fontSize: 64, color: "#3f3f46" }}>Wedding invitation preview</div>
      <div style={{ marginTop: 24, fontSize: 32, color: "#78716c" }}>Baba Saab Events</div>
    </div>
  );
}
```

`src/app/(invite)/invitation/[slug]/card/route.js`:
```js
import { ImageResponse } from "next/og";
import { InvitationCard } from "@/InvitationModule/og/Card";
import { cardModel } from "@/InvitationModule/og/cardModel";
import { ogFonts } from "@/InvitationModule/og/fonts";
import { getPublicInvitation } from "@/InvitationModule/server/publicInvitation";

export const dynamic = "force-dynamic";

// Always the live copy: this URL carries no preview code, so a draft's photos can never end up in a share card.
export async function GET(_request, { params }) {
  const result = await getPublicInvitation(params.slug).catch(() => null);
  if (!result || result.mode !== "live") return new Response("Not found", { status: 404 });
  return new ImageResponse(<InvitationCard model={cardModel(result.invitation)} />, {
    width: 1200,
    height: 630,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
```
Rename to `route.jsx` if the build rejects JSX in `.js` route files.

`src/app/api/og/invitation-preview/route.js`:
```js
import { ImageResponse } from "next/og";
import { PreviewCard } from "@/InvitationModule/og/Card";
import { ogFonts } from "@/InvitationModule/og/fonts";

export async function GET() {
  return new ImageResponse(<PreviewCard />, { width: 1200, height: 630, fonts: await ogFonts() });
}
```

- [ ] **Step 4: Verify locally**

Run `npx vitest run src/InvitationModule/og` → PASS. Then `npx next build` → success. With the sandbox up, `npm run dev`, publish a test invitation (after Task 6) or check `/api/og/invitation-preview` in the browser now: a 1200×630 PNG with the text. Hindi rendering is checked in Task 7 manual QA.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/og "src/app/(invite)/invitation/[slug]/card" src/app/api/og next.config.js
git commit -m "feat(invite): WhatsApp share card images for live and preview links"
```

---

### Task 6: Staff screens — publish panel, Update live, QR, list badges, keep-live media rule

**Files:**
- Create: `src/AdminModule/editor/publish/links.js`, `links.test.js` (pure URL/QR helpers)
- Create: `src/AdminModule/editor/publish/PublishPanel.jsx`, `SlugField.jsx`, `LinkBox.jsx`, `ChangesNote.jsx`, `publish.test.jsx`
- Modify: `src/AdminModule/editor/steps/ReviewStep.jsx` (+ test), `src/AdminModule/editor/EditorShell.jsx` (+ test), `src/AdminModule/editor/test-utils.jsx`
- Modify: `src/AdminModule/invitations/InvitationList.jsx` (+ test)
- Modify: `package.json`, `package-lock.json` (`qrcode`)

**Interfaces:**
- Consumes: Task 1 `generateSlug`, `liveState`, `LIVE_BADGE`, `mediaKeysToDelete`; Task 3 `publishActions` prop (`checkSlugAction`, `setSlugAction`, `newPreviewLinkAction`, `publishAction`, `updateLiveAction`) and `invitation` fields; existing `useAutosave` (`state.version`, `flushNow`), `deleteMedia`, `uploads.busy`, `whatsappShareUrl`.
- Produces:
  - `links.js`: `liveUrl(origin, slug)`, `previewUrl(origin, slug, token)`, `qrFileName(slug)`, `QR_OPTIONS`, `downloadQr({ url, slug, toDataURL? })`, `previewMessage(url)`, `liveMessage(url)`
  - Steps receive a `publishing` prop: `{ live, state, busy, error, onSetSlug, onCheckSlug, onPublish, onUpdateLive, onNewPreviewLink, origin }` where `live = { status, slug, previewToken, liveVersion, publishedContent }` and `state = liveState(...)`.

- [ ] **Step 1: Dependency**

```bash
npm install qrcode@^1.5.4
npm install --package-lock-only
```

- [ ] **Step 2: Link helpers (test first)**

`src/AdminModule/editor/publish/links.test.js`:
```js
import { describe, expect, it, vi } from "vitest";
import { downloadQr, liveUrl, previewUrl, QR_OPTIONS, qrFileName } from "./links";

describe("links", () => {
  it("builds live and preview URLs on the current host", () => {
    expect(liveUrl("https://www.babasaab.com", "priya-weds-rahul")).toBe("https://www.babasaab.com/invitation/priya-weds-rahul");
    expect(previewUrl("https://x.amplifyapp.com", "a-b", "tok_1")).toBe("https://x.amplifyapp.com/invitation/a-b?preview=tok_1");
  });
  it("names the QR file after the link", () => expect(qrFileName("priya-weds-rahul")).toBe("priya-weds-rahul-qr.png"));
  it("uses print-friendly QR settings", () => {
    expect(QR_OPTIONS).toEqual({ width: 1024, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  });
  it("downloads a PNG of the live URL", async () => {
    const toDataURL = vi.fn(async () => "data:image/png;base64,AAA");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadQr({ url: "https://www.babasaab.com/invitation/a-b", slug: "a-b", toDataURL });
    expect(toDataURL).toHaveBeenCalledWith("https://www.babasaab.com/invitation/a-b", QR_OPTIONS);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
```

`src/AdminModule/editor/publish/links.js`:
```js
export const QR_OPTIONS = { width: 1024, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } };

// The admin and the public pages share a host, so links built here work on production and preview branches alike.
export const liveUrl = (origin, slug) => `${origin}/invitation/${slug}`;
export const previewUrl = (origin, slug, token) => `${liveUrl(origin, slug)}?preview=${encodeURIComponent(token)}`;
export const qrFileName = (slug) => `${slug}-qr.png`;

export const previewMessage = (url) => `Here is the preview of your invitation. Please check every detail and let us know if anything needs changing:\n${url}`;
export const liveMessage = (url) => `Your invitation is live! Share this link with your guests:\n${url}`;

export async function downloadQr({ url, slug, toDataURL }) {
  const encode = toDataURL ?? (await import("qrcode")).toDataURL;
  const dataUrl = await encode(url, QR_OPTIONS);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = qrFileName(slug);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
```

- [ ] **Step 3: Panel components (test first)**

`src/AdminModule/editor/publish/publish.test.jsx` — render `PublishPanel` directly with a `publishing` object built by a helper:
```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PublishPanel from "./PublishPanel";

const base = (over = {}) => ({
  live: { status: "draft", slug: "priya-weds-rahul-k3f9", previewToken: "tok_1", liveVersion: null, publishedContent: null },
  state: "draft",
  busy: false,
  error: null,
  origin: "https://www.babasaab.com",
  onSetSlug: vi.fn(async () => ({ ok: true })),
  onCheckSlug: vi.fn(async () => ({ status: "available" })),
  onPublish: vi.fn(async () => ({ ok: true })),
  onUpdateLive: vi.fn(async () => ({ ok: true })),
  onNewPreviewLink: vi.fn(async () => ({ ok: true })),
  ...over,
});

describe("PublishPanel — draft", () => {
  it("shows the link name and the customer preview link", () => {
    render(<PublishPanel publishing={base()} ready content={{}} />);
    expect(screen.getByLabelText("Link name")).toHaveValue("priya-weds-rahul-k3f9");
    expect(screen.getByText("https://www.babasaab.com/invitation/priya-weds-rahul-k3f9?preview=tok_1")).toBeInTheDocument();
  });
  it("checks availability as staff type", async () => {
    const p = base({ onCheckSlug: vi.fn(async () => ({ status: "taken", message: "Already taken — try another." })) });
    render(<PublishPanel publishing={p} ready content={{}} />);
    const field = screen.getByLabelText("Link name");
    await userEvent.clear(field);
    await userEvent.type(field, "priya-rahul");
    expect(await screen.findByText("Already taken — try another.")).toBeInTheDocument();
  });
  it("disables Publish until the checklist passes", () => {
    render(<PublishPanel publishing={base()} ready={false} content={{}} />);
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });
  it("disables Publish while uploads run", () => {
    render(<PublishPanel publishing={base({ busy: true })} ready content={{}} />);
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText("Wait for uploads to finish")).toBeInTheDocument();
  });
  it("confirms before publishing, with the link name", async () => {
    const p = base();
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<PublishPanel publishing={p} ready content={{}} />);
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(p.onPublish).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(window.confirm).toHaveBeenLastCalledWith("Publish? The link name can't be changed after this.");
    expect(p.onPublish).toHaveBeenCalledWith("priya-weds-rahul-k3f9");
  });
  it("confirms before making a new preview link", async () => {
    const p = base();
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<PublishPanel publishing={p} ready content={{}} />);
    await userEvent.click(screen.getByRole("button", { name: "New preview link" }));
    expect(window.confirm).toHaveBeenLastCalledWith("The old preview link will stop working.");
    expect(p.onNewPreviewLink).toHaveBeenCalled();
  });
});

describe("PublishPanel — published", () => {
  const live = { status: "published", slug: "priya-weds-rahul-k3f9", previewToken: "tok_1", liveVersion: 7, publishedContent: {} };
  it("locks the link name and offers the live link and QR", () => {
    render(<PublishPanel publishing={base({ live, state: "live" })} ready content={{}} />);
    expect(screen.getByLabelText("Link name")).toHaveAttribute("readonly");
    expect(screen.getByText("https://www.babasaab.com/invitation/priya-weds-rahul-k3f9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download QR code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });
  it("offers Update live when there are changes", async () => {
    const p = base({ live, state: "changes" });
    render(<PublishPanel publishing={p} ready content={{}} />);
    expect(screen.getByText("You have changes guests can't see yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Update live invitation" }));
    await waitFor(() => expect(p.onUpdateLive).toHaveBeenCalled());
  });
  it("shows a server refusal", () => {
    render(<PublishPanel publishing={base({ live, state: "changes", error: "Some details are still missing." })} ready content={{}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Some details are still missing.");
  });
});
```

Implement (Tailwind, same button classes as the editor: `min-h-[44px] rounded-full ...`):

`ChangesNote.jsx` — `({ onUpdateLive, pending })` → yellow box (`role="status"`) "You have changes guests can't see yet" + button "Update live invitation" (disabled while `pending`). Used both in the panel and in the editor header.

`LinkBox.jsx` — `({ label, url, message })` → label, the URL as text (`break-all`), buttons **Copy** (`navigator.clipboard.writeText(url)`, then "Copied" for 2 s) and **Send on WhatsApp** (`<a href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer">`).

`SlugField.jsx` — `({ value, locked, onCheck, onSave })`: `<label htmlFor="slug">Link name</label>` + input (`readOnly` when locked; lower-cases input as typed); prefix text `/invitation/`; debounced (400 ms) `onCheck(value)` while editing, showing "✓ available" / the returned message; a **Save link name** button (shown when the value differs from the saved slug and the check says available) calling `onSave(value)`; when locked, a note "Locked after publishing so links already shared keep working."

`PublishPanel.jsx` — `({ publishing, ready })`:
```jsx
"use client";

import { useState } from "react";
import ChangesNote from "./ChangesNote";
import LinkBox from "./LinkBox";
import SlugField from "./SlugField";
import { downloadQr, liveMessage, liveUrl, previewMessage, previewUrl } from "./links";

const button = "min-h-[44px] rounded-full px-5 text-sm";

export default function PublishPanel({ publishing, ready }) {
  const { live, state, busy, error, origin } = publishing;
  const [slug, setSlug] = useState(live.slug ?? "");
  const [pending, setPending] = useState(false);
  const published = live.status === "published";

  const run = async (fn) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  };

  const publish = () => {
    if (!window.confirm("Publish? The link name can't be changed after this.")) return;
    run(() => publishing.onPublish(slug));
  };
  const newPreview = () => {
    if (!window.confirm("The old preview link will stop working.")) return;
    run(() => publishing.onNewPreviewLink());
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      ) : null}

      <SlugField value={slug} onChange={setSlug} locked={published} saved={live.slug} onCheck={publishing.onCheckSlug} onSave={publishing.onSetSlug} />

      {live.slug && live.previewToken ? (
        <div className="space-y-2">
          <LinkBox label="Customer preview link" url={previewUrl(origin, live.slug, live.previewToken)} message={previewMessage(previewUrl(origin, live.slug, live.previewToken))} />
          <button type="button" onClick={newPreview} disabled={pending} className={`${button} border border-stone-300`}>
            New preview link
          </button>
        </div>
      ) : (
        <p className="text-sm text-stone-600">Save a link name to get the customer preview link.</p>
      )}

      {published ? (
        <div className="space-y-3">
          {state === "changes" ? <ChangesNote pending={pending} onUpdateLive={() => run(publishing.onUpdateLive)} /> : null}
          <LinkBox label="Live link for guests" url={liveUrl(origin, live.slug)} message={liveMessage(liveUrl(origin, live.slug))} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadQr({ url: liveUrl(origin, live.slug), slug: live.slug })} className={`${button} border border-stone-300`}>
              Download QR code
            </button>
            <a href={liveUrl(origin, live.slug)} target="_blank" rel="noopener noreferrer" className={`${button} inline-flex items-center border border-stone-300`}>
              Open
            </a>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" onClick={publish} disabled={!ready || busy || pending || !slug} className={`${button} bg-stone-900 text-white disabled:opacity-40`}>
            Publish
          </button>
          {busy ? <p className="mt-2 text-xs text-stone-500">Wait for uploads to finish</p> : null}
        </div>
      )}
    </div>
  );
}
```
(Pass `onChange`/`saved` through to `SlugField`; adjust the test's `base()` if you rename props, but keep the visible text and roles the tests use.)

`ReviewStep.jsx`: keep the checklist; replace the disabled Publish block with `<PublishPanel publishing={publishing} ready={items.length === 0} />` (accept a `publishing` prop). Update `ReviewStep.test.jsx`: the old "Publishing arrives in the next release" assertion goes; add one test that the panel renders and that Publish is disabled when the checklist has items.

- [ ] **Step 4: EditorShell wiring (test first)**

Add to `src/AdminModule/editor/EditorShell.test.jsx` (extend `test-utils.jsx` so `renderEditor` accepts `invitation` overrides and a `publishActions` object of `vi.fn()`s, defaulting to draft fields `{ status: "draft", slug: "priya-weds-rahul-k3f9", previewToken: "tok_1", liveVersion: null, publishedContent: null }`):
- **keeps a file the live copy uses:** published invitation whose `content` and `publishedContent` both have `media.coverKey = "invitations/inv-test/a.jpg"`; remove the cover on step 5 (confirm), let the autosave succeed → `deleteMedia` NOT called with that key.
- **deletes it after Update live:** continue: on step 8 click **Update live invitation** (`updateLiveAction` resolves `{ ok: true, liveVersion: 2 }`) → `deleteMedia` called with `["invitations/inv-test/a.jpg"]`.
- **flushes before publishing and sends the latest version:** type a change, go to step 8, click Publish (confirm) → `publishAction` called with `{ id: "inv-test", expectedVersion: <version after the flush>, slug: "priya-weds-rahul-k3f9" }`.
- **header note:** published with `version > liveVersion` → "You have changes guests can't see yet" visible on step 2.
- **conflict:** `publishAction` resolves `{ ok: false, conflict: true }` → the existing conflict banner text "Updated by someone else — reload" (or the panel `alert` with that text) is shown.
- **auto-claims a link name:** draft with `slug: null` and English names → on reaching step 8, `setSlugAction` called once with a slug matching `/^priya-weds-rahul-[a-z2-9]{4}$/`.

Implement in `EditorShell.jsx`:
```jsx
  const [live, setLive] = useState(() => ({
    status: invitation.status ?? "draft",
    slug: invitation.slug ?? null,
    previewToken: invitation.previewToken ?? null,
    liveVersion: invitation.liveVersion ?? null,
    publishedContent: invitation.publishedContent ?? null,
  }));
  const liveRef = useRef(live);
  liveRef.current = live;
  const [publishError, setPublishError] = useState(null);
```
- `onSaved` → `mediaKeysToDelete({ before: lastSaved.current, after: saved, keep: [liveRef.current.publishedContent], invitationId: invitation.id })` instead of `removedMediaKeys`.
- A `versionRef` holding the latest saved version (`state.version`); `latestVersion = async () => { const r = await flushNow(); return r?.version ?? versionRef.current; }` — read `useAutosave`'s `flushNow` to confirm what it resolves with and adapt (it must resolve after any in-flight/queued save).
- `onPublish(slug)`: `setPublishError(null)`; `const expectedVersion = await latestVersion()`; `const r = await publishActions.publishAction({ id, expectedVersion, slug })`; ok → `setLive((l) => ({ ...l, status: "published", slug: r.slug, liveVersion: r.liveVersion, publishedContent: lastSaved.current }))`; conflict → `setPublishError("Updated by someone else — reload the page.")`; else `setPublishError([r.message, ...(r.missing ?? [])].join(" "))`.
- `onUpdateLive()`: same flow with `updateLiveAction`; on ok: `const old = liveRef.current.publishedContent; const now = lastSaved.current; deleteMedia(mediaKeysToDelete({ before: old, after: now, keep: [now], invitationId: id }))` when non-empty, then `setLive((l) => ({ ...l, liveVersion: r.liveVersion, publishedContent: now }))`.
- `onSetSlug(slug)` → `setSlugAction`; ok → `setLive((l) => ({ ...l, slug: r.slug }))`, else `setPublishError(r.message)`. `onCheckSlug(slug)` → `checkSlugAction({ id, slug })`. `onNewPreviewLink()` → `newPreviewLinkAction`; ok → update `previewToken`.
- Auto-claim: `useEffect` when `step === 8 && live.status === "draft" && !live.slug` (run once per mount via a ref): `onSetSlug(generateSlug(content))`; if the result is `SlugTaken`, try once more with a new `generateSlug`.
- `const state = liveState({ status: live.status, version: state.version, liveVersion: live.liveVersion })` (rename to avoid clashing with the autosave `state`, e.g. `liveStatus`).
- Header: when `liveStatus === "changes"` and `step !== 8`, render `<ChangesNote onUpdateLive={onUpdateLive} />` under `SaveBanners`.
- Pass `publishing={{ live, state: liveStatus, busy: uploads.busy, error: publishError, origin: typeof window === "undefined" ? "" : window.location.origin, onSetSlug, onCheckSlug, onPublish, onUpdateLive, onNewPreviewLink }}` to `<Step />`.

- [ ] **Step 5: List badges (test first)**

In `InvitationList.test.jsx` add: rows `{ status: "draft" }`, `{ status: "published", version: 7, liveVersion: 7, slug: "a-b" }`, `{ status: "published", version: 8, liveVersion: 7, slug: "c-d" }` render badges "Draft", "Live", "Changes not live", and the published rows have an **Open** link to `/invitation/a-b` / `/invitation/c-d` (`target="_blank"`). Implement in `InvitationList.jsx` with `LIVE_BADGE[liveState(row)]` where the current status text is rendered (keep the existing status filter on `row.status`).

- [ ] **Step 6: Run everything, build, commit**

Run: `npm test` → all pass; `npx next build` → success.
```bash
git add src/AdminModule package.json package-lock.json
git commit -m "feat(editor): publish panel, Update live, preview links, QR download and list badges"
```

---

### Task 7: Staff guide, verification, preview branch, hand-off

**Files:**
- Modify: `docs/admin-guide.md`

- [ ] **Step 1: Staff guide**

Replace the step ⑧ "Publishing arrives in the next release" wording and add sections (plain language, same tone as the rest of the guide):
- **Preview links for customers** — where the link is, Copy / Send on WhatsApp, that it always shows the latest saved draft with a "Preview — not published yet" banner, and **New preview link** if it went to the wrong person.
- **Choosing the link name** — the suggested name, rules (lowercase letters, numbers, dashes), "✓ available", and that it's locked after publishing.
- **Publishing** — checklist must be clear, uploads finished, confirm dialog.
- **Making changes after publishing** — edits save privately; the yellow "You have changes guests can't see yet" note; **Update live invitation**; the customer can check changes on the preview link first.
- **WhatsApp preview cards** — what the card shows; WhatsApp may show an older card for a while to people who already got the link.
- **QR codes** — Download QR code (only after publishing), prints sharply, test-scan before printing.
- **RSVP note** — guests' RSVP form appears on live invitations from the next release (Phase 4).

- [ ] **Step 2: Automated checks**

Run each and keep the output for the report:
- `npm test` → all pass
- `npx tsc --noEmit -p amplify` → exit 0
- `npx next build` → success (stop any dev server first)
- Lockfile: copy `package.json` + `package-lock.json` to a clean scratch dir and run `npm ci --ignore-scripts --no-audit --no-fund` → success
- Sandbox: `npx ampx sandbox --once` → success

- [ ] **Step 3: Local smoke test (sandbox)**

`npm run dev`, sign in, open an invitation, reach step ⑧: link name auto-claimed; preview link opens (logged-out private window) with the banner; Publish; the live link opens logged out; edit a field → live page unchanged → **Update live invitation** → live page changed; unknown slug and a draft slug without token show "This invitation is no longer available"; `/invitation/<slug>/card` returns a PNG; Download QR code saves `<slug>-qr.png` that a phone camera scans.

- [ ] **Step 4: Commit the guide**

```bash
git add docs/admin-guide.md
git commit -m "docs(admin-guide): preview links, publishing, Update live, share cards and QR codes"
```

- [ ] **Step 5: Ask the owner before pushing**

STOP and ask: push `feature/invitations-phase-3` and connect it as an Amplify preview branch? Only after a yes: `git push -u origin feature/invitations-phase-3`. After the preview build is green, create the owner's preview login (pool id from `aws cloudformation describe-stacks` outputs of the branch's auth stack).

- [ ] **Step 6: Manual QA on the preview branch (with the owner)**

- Publish on the preview site; open the live link on Android Chrome and iOS Safari, logged out; first screen fast on 4G.
- Update live: change visible within seconds; preview link shows unpushed edits before that.
- New preview link: old link shows "no longer available".
- Paste the live link into WhatsApp on a real phone: card shows cover, names, date. Paste a preview link: generic card.
- A Hindi-only test invitation: slug `invitation-xxxxxx`, Hindi card title, Devanagari renders on the card image.
- Print or screen-scan the QR code.
- Remove a photo after publishing → still on the live page until Update live → then gone (and file deleted).
- `next/og` works on Amplify compute (card URL returns an image); if not, report the error log line.
