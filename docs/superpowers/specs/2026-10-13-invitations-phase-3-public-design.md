# Digital Invitations — Phase 3: Publishing and the public page

Parent spec: `docs/superpowers/specs/2026-10-06-digital-invitations-design.md` (approved). Builds on Phase 2a (`2026-10-08-invitations-phase-2a-editor-design.md`) and 2b (`2026-10-12-invitations-phase-2b-media-design.md`). This document settles Phase 3 decisions only; where it differs from the parent spec, this document wins.

## 1. Scope

**In:** link names (slugs), customer preview links, Publish, "Update live invitation", the public page `/invitation/<slug>`, the "no longer available" page, the WhatsApp / Open Graph card, QR code download, staff-guide sections.

**Out:** guest links `?g=`, per-guest QR codes, RSVP storage and view counts (Phase 4); unpublish, archive, Thank-you page, delete/restore, purge (Phase 5).

**Done means:** staff can send a customer a private preview link, publish once the checklist passes, share a live link that opens fast on a phone and shows a rich card in WhatsApp, download a printable QR code, and later push edits live with one click. Drafts and unknown links are never visible to the public.

## 2. Decisions (agreed with the owner, 2026-10-13)

| # | Decision |
|---|---|
| D1 | Edits to a published invitation are **not** live on autosave. They save privately; guests see them only after **Update live invitation**. (Changes the parent spec's "revalidated on save".) |
| D2 | The link name is generated as `<bride>-weds-<groom>-<4char>`, editable until publish, **locked after publish**. All later changes appear at the same link. |
| D3 | The preview link always shows the **latest saved draft**, with a "Preview — not published yet" banner, before and after publishing. **New preview link** replaces the code; the old one stops working. |
| D4 | Public data is served by a **locked-down public lookup** in the existing Amplify backend (no direct database access from the website, no public files of drafts). |
| D5 | WhatsApp card = cover photo + names + date in the template's palette; preview links get a plain, generic card. |
| D6 | QR code: 1024×1024 PNG, black on white with a quiet-zone border, generated in the browser, offered only once published. |

## 3. Data

`Invitation` gains:

| Field | Meaning |
|---|---|
| `slug` (string, nullable) | The link name. Set when first generated; locked once `status = published`. |
| `previewToken` (string) | Random, URL-safe, ≥ 22 chars (≥ 128 bits). Created with the invitation; existing invitations get one on first open of step ⑧. |
| `publishedContent` (json, nullable) | The snapshot guests see. Written only by Publish / Update live. |
| `liveVersion` (int, nullable) | The `version` that was copied into `publishedContent`. `version > liveVersion` ⇒ "changes not live". |
| `publishedAt`, `liveUpdatedAt` (datetime, nullable) | When it was first published / last pushed live. |

New table `InvitationSlug` — key `slug`, attribute `invitationId`. It exists only to guarantee uniqueness: a slug is claimed with a conditional put (`attribute_not_exists(slug)`). Before publish, changing the link name claims the new slug and releases the old one; after publish it is never released (until Phase 5 purge).

**Slug rules:** 3–60 chars, `[a-z0-9-]`, no leading, trailing or doubled dashes. Generated from the English couple names (lower-cased, accents stripped, non-letters dropped); if either English name is missing, `invitation-<6char>`. The 4/6-char suffix uses an unambiguous alphabet (no `0/o/1/l`). Reserved: `new`, `preview`, `admin`, `api`.

## 4. Backend operations

All staff operations require the `admin` group (as today) and keep the optimistic-concurrency check on `version`.

| Operation | Who | Does |
|---|---|---|
| `checkSlug(slug, invitationId)` | staff | Returns `available` / `taken` / `invalid`. Own current slug counts as available. |
| `setSlug(id, expectedVersion, slug)` | staff | Draft only. Claims new slug, releases old, sets `Invitation.slug`. Fails if published or taken. |
| `regeneratePreviewToken(id)` | staff | Replaces `previewToken`. |
| `publishInvitation(id, expectedVersion)` | staff | Draft only. Server re-runs the publish checklist; refuses if anything is missing or no slug. Copies `content` → `publishedContent`, sets `liveVersion = version`, `status = published`, `publishedAt`, `liveUpdatedAt`. |
| `updateLiveInvitation(id, expectedVersion)` | staff | Published only. Re-runs the checklist; copies `content` → `publishedContent`, sets `liveVersion`, `liveUpdatedAt`. |
| `publicInvitation(slug, previewToken?)` | **anyone** | See §5. |

Slug claim + invitation update happen in one DynamoDB transaction (or, if the resolver tooling can't span both tables, in a small Lambda that does the transaction), so a slug is never claimed without its invitation and vice versa.

**Public access** uses Amplify's unauthenticated (guest) identity-pool role, granted to `publicInvitation` only — not an API key, which would expire yearly. The guest role can call nothing else. The website's server is the only intended caller, but the operation is safe even if called directly from a browser, because it enforces every rule itself.

## 5. Public resolution

`publicInvitation(slug, previewToken?)` returns `{ mode, templateId, content }` or `null`:

| Request | Result |
|---|---|
| unknown slug | `null` |
| valid `previewToken` for that invitation (any status except deleted) | `mode: "preview"`, current draft `content` |
| `published`, no/invalid token | `mode: "live"`, `publishedContent` |
| `draft`, no/invalid token | `null` |
| any other status (Phase 5) | `null` until Phase 5 defines it |

`content` is the **public projection**: only fields the templates render. It never includes `createdBy`, `updatedBy`, `searchText`, `previewToken`, `version` or other bookkeeping. The projection is one tested function shared by the resolver's output shaping and the page.

## 6. Pages

**`/invitation/[slug]`** (inside the existing `(invite)` layout: no site header/footer, `noindex`, light colour scheme)

- **Live:** rendered by `InvitationRenderer` with `ctx.mode = "live"`. Cached as a static page and tagged `invitation:<slug>`; Publish and Update live call `revalidateTag` so the new version appears within seconds. A long background revalidate (1 day) is the safety net.
- **Preview** (`?preview=<token>`): rendered on every request, never cached, with a fixed top banner "Preview — not published yet". Preview requests never prime or replace the live cache.
- **Not available** (`null`): a calm page, "This invitation is no longer available", HTTP 404, Baba Saab credit, no other detail.
- **Backend error:** "Couldn't load this invitation — please try again in a minute", HTTP 503, not cached. Never shown as "no longer available".

Share buttons on the page use `shareableUrl`, which already strips `preview` and `g` so a forwarded link never carries the preview code.

**Caching risk:** Amplify `WEB_COMPUTE` hosting must honour on-demand `revalidateTag`. This is verified on the preview branch before handing off. Fallback if it does not: render live pages dynamically with a short CDN cache (`s-maxage=60, stale-while-revalidate`), which still meets the 2 s target.

## 7. WhatsApp / Open Graph card

- `generateMetadata` on the page sets `og:title`, `og:description`, `og:image`, `twitter:card = summary_large_image`.
- **Title:** "Priya & Rahul are getting married" (Hindi equivalent for `language = hi`; English for `both`).
- **Description:** "<main date, long form> · <venue city or venue name>".
- **Image:** `/invitation/[slug]/opengraph-image`, 1200×630, built with `next/og` from the **live** content: cover photo (cropped to fill) with a soft gradient, names and date in the template palette's colours. No cover → the palette background with the template emblem. Devanagari names render with a bundled Devanagari font.
- **Preview links** get a generic card: "Wedding invitation preview" and the Baba Saab image, never the draft's photos or names.
- WhatsApp caches cards on its side; the staff guide says a changed card can take time to appear for people who already received the link.

## 8. Staff screens

**Step ⑧ (Review & publish)**

- Publish checklist (unchanged).
- **Link name** field with the generated name, live availability check ("✓ available" / "already taken" / rule hint), saved via `setSlug`. Read-only after publish, with a lock note.
- **Customer preview link:** Copy, Send on WhatsApp (pre-filled message), New preview link (confirm: "The old preview link will stop working").
- **Publish** (enabled only when the checklist passes and a slug is set) → confirm "Publish? The link name can't be changed after this." Any unsaved edits are flushed first.
- After publish: live link with Copy, Send on WhatsApp, **Download QR code**, Open.
- When `version > liveVersion`: a yellow note "You have changes guests can't see yet" with **Update live invitation** (flushes pending edits first). The note also appears in the editor header on every step.

**Invitations list:** status badges "Draft", "Live", "Changes not live"; live rows link to the public page.

**QR code:** generated client-side (`qrcode` package), error-correction level M, 1024×1024, 4-module white border, file name `<slug>-qr.png`. Encodes the live URL `https://www.babasaab.com/invitation/<slug>` (built from `ADMIN_SITE_URL`'s origin, so the preview branch encodes its own host).

## 9. Errors and edge cases

- Version conflict on publish / update live → the existing conflict banner ("Updated by someone else — reload").
- Checklist fails server-side (e.g. edited in another tab) → refusal listing what's missing, linked to the steps.
- Slug taken between check and save → "That link name was just taken — try another".
- Publish while uploads are running → Publish disabled with "Wait for uploads to finish".
- Media removed after publishing: the 2b "delete after save" rule would delete files the live copy still uses. **Rule:** a file is only deleted when neither the draft nor `publishedContent` references it; files referenced only by the old live copy are deleted after the next Update live.

## 10. Testing

- **Unit:** slug generation, rules and suffix alphabet; public projection (no private fields); resolution table (§5) incl. wrong token, draft, unknown; "changes not live" logic; OG title/description text for en/hi/both; QR file name and URL; media-deletion rule including `publishedContent`.
- **Component:** step ⑧ states (draft without slug, draft ready, published, published with changes), slug availability feedback, confirm dialogs, list badges.
- **Resolver tests:** request/response shaping for publish, update live and `publicInvitation` (as done for `saveInvitation`).
- **Preview branch (manual):** publish → open live link logged out on Android Chrome and iOS Safari; edit → not visible → Update live → visible within seconds; preview link before and after publish; New preview link kills the old one; WhatsApp card on a real phone; printed QR scans; unknown and draft links show the 404 page.

## 11. Staff guide

`docs/admin-guide.md` gains: Preview links for customers, Choosing the link name, Publishing, Making changes after publishing (Update live), WhatsApp preview cards, QR codes.
