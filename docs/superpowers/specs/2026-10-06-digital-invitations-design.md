# Digital Invitations — Design Spec

**Date:** 2026-10-06
**Status:** Approved (2026-10-06)
**Project:** baba-saab (Next.js site hosted on AWS Amplify)

## 1. Goal

Let Baba Saab staff create, publish and manage digital event invitations (primarily Indian weddings) for customers. Staff pick one of 4 templates, fill in the customer's details in an admin editor, and share a public link `/invitation/<slug>`. Customers never log in; they receive a preview link to approve and the final link to share.

### Success criteria
- A staff member can go from "new invitation" to a published, shareable link in under 20 minutes with the customer's details in hand.
- Published invitations load their first screen in under 2 s on 4G and show a rich preview card when pasted into WhatsApp.
- Drafts, deleted invitations, guest phone numbers and preview tokens are never publicly reachable.
- After an event, invitations archive, then purge themselves (database rows and S3 files) without staff action.

### Decisions made
| Topic | Decision |
|---|---|
| Who creates invitations | Staff only (admin panel). No customer accounts, no payments. |
| Templates | 4 original templates inspired by (not copied from) reference sites |
| Customisation | Content + preset palettes per template + show/hide/reorder sections |
| Backend | AWS Amplify Gen 2 (Cognito, DynamoDB via Amplify Data, S3 via Amplify Storage, Lambda) |
| Framework | Upgrade Next.js 13.5 → 14 before feature work |
| Scope at launch | All core features + extras A–H (see §3) |

### Out of scope
Customer self-serve accounts, payments, custom colour pickers / free-form layout, a 5th+ template, native apps, non-invitation products.

## 2. Templates

| id | Name | Character | Reveal style |
|---|---|---|---|
| `royal` | Royal Rajasthani | Maroon & gold, palace-arch frame | Scratch-to-reveal date |
| `floral` | Floral Pastel | Watercolour florals, pink & sage | Gentle scroll animation |
| `temple` | Temple Classic | Temple motif, kolam borders | Envelope opening |
| `minimal` | Modern Minimal | Monogram cover, clean type | Tap to reveal |

Each template ships 3–4 preset palettes. All templates are original artwork and layouts; reference sites are for feature inspiration only.

**Invocation presets** (staff may also enter custom text):

| id | Name | Text |
|---|---|---|
| `vakratunda` | Ganesh Vandana | वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥ |
| `shri-ganeshaya` | Shri Ganeshaya Namah | ॥ श्री गणेशाय नमः ॥ |
| `mangalam` | Mangal Shloka | मङ्गलम् भगवान विष्णुः मङ्गलम् गरुड़ध्वजः। मङ्गलम् पुण्डरीकाक्षः मङ्गलाय तनो हरिः॥ |
| `shubh-vivah` | Shubh Vivah | ॥ शुभ विवाह ॥ |
| `om` | Om | ॥ ॐ ॥ |

**Sections** (every template implements all): Cover, Invocation, Couple, SaveTheDate, Countdown, Venue, Travel, Schedule, Gallery, Film, RSVP, Closing.

## 3. Feature list

Core:
1. Names, families, date, live countdown, venue + map, multi-day event schedule
2. Photo gallery with lightbox, cover photos
3. Background music — chosen from a staff-managed Music Library, or a one-off upload for a single invitation
4. Invitation film — YouTube link or uploaded video (≤ 100 MB)
5. RSVP form, responses visible to staff
6. Reveal opening animation (per template)
7. Add-to-calendar (Google + `.ics`) and WhatsApp share

Extras:
- **A** Personalised guest links (`?g=<code>` → "Dear Sharma Parivar"), bulk-generated from a pasted list
- **B** WhatsApp/Open Graph preview card (photo + names + date)
- **C** Draft status + private preview link for customer approval
- **D** Event-specific invites per guest
- **E** Language: English, Hindi, or both
- **F** QR code per invitation and per guest link (PNG download)
- **G** View counts, total and per guest
- **H** Auto-archive after the event into a Thank-you page with event photos

## 4. Data model

```
Invitation
  id, slug (unique, editable; generated "<bride>-weds-<groom>-<4char>")
  templateId: royal | floral | temple | minimal
  theme: { palette, sectionOrder: SectionId[], hidden: SectionId[] }
  status: draft | published | archived | deleted
  language: en | hi | both
  couple: { bride, groom } each { name: L, parentsLine: L, photoKey? }
  hosts: { closingLine: L, families: L[], contactPhone }
  invocation: { deity: preset id, text: L }
  mainDate: ISO date
  venue: { name: L, address: L, mapsUrl, travelNotes?: L }
  events: [{ id, name: L, date, time, venueName?: L, address?: L, mapsUrl?, dressCode?: L, description?: L }]
  media: {
    coverKey?, gallery: [{ key, caption?: L }],
    music?: { type: library | upload, trackId?, key }   (key copied from the library track so rendering needs no lookup),
    film?: { type: youtube | upload, url?, key? }
  }
  rsvp: { enabled, deadline?: ISO date, askGuestCount, askMeal }
  showCredit: boolean (default true)
  archive: { archiveAfterDays: number (default 7), thankYouMessage?: L, photos: [{ key }] }
  previewToken (random, regenerable)
  lifecycle: { publishedAt?, archivedAt?, deletedAt?, purgeAt? }
  version (int, optimistic concurrency)
  createdBy, createdAt, updatedAt

Guest (→ Invitation)
  id, name, phone?, code (random, ≥ 6 chars, URL-safe, unique per invitation)
  invitedEvents: eventId[]   (empty = all events)
  viewCount, lastViewedAt

Rsvp (→ Invitation, optional → Guest)
  id, name, phone, attending: yes | no | maybe, guestCount?, eventIds[], meal?, message?
  source: guest | staff, ipHash, createdAt, updatedAt

ViewCounter (→ Invitation, per day)
  date, count

MusicTrack (shared library, managed at /admin/music)
  id, name, key (S3, under music-library/), durationSec?, createdBy, createdAt
```

**Music library rules:** tracks are MP3, ≤ 10 MB, uploaded and previewed by staff. Library files live under `music-library/`, never under an invitation's prefix, so purging an invitation never deletes them. A track that any invitation still references cannot be deleted; the library page lists the invitations using it. Staff are reminded on the upload screen to use only tracks they hold rights to.

`L` = localised text `{ en?: string, hi?: string }`. Required languages follow `Invitation.language`.

Media fields store S3 **keys**, never URLs. All media for an invitation lives under `invitations/<invitationId>/…`.

A single zod schema in `src/InvitationModule/schema/` is the source of truth for validation in the editor, server actions and template rendering.

## 5. Lifecycle

```
draft ──publish──▶ published ──(last event + archiveAfterDays)──▶ archived ──(30 days)──▶ purged
any state ──staff Delete──▶ deleted ──(30 days, restorable)──▶ purged
any state ──staff "Delete permanently now" (confirm)──▶ purged
```

- **Archived:** public link shows the Thank-you page (message + archive photos). Staff can extend (push `purgeAt`) or un-archive.
- **Deleted:** public link shows "This invitation is no longer available". Restorable until `purgeAt`.
- **Purge:** delete all S3 objects under `invitations/<id>/`, then Guest, Rsvp, ViewCounter and Invitation rows. Idempotent.
- **Scheduled function** (daily Lambda): archives due invitations, purges due ones, retries failures next run, logs outcomes.
- **Replaced/removed media** is deleted from S3 at save time.
- Dashboard lists invitations whose `purgeAt` is within 24 h.

## 6. Routes

Public (no auth, `noindex`):
| Route | Purpose |
|---|---|
| `/invitation/[slug]` | Live invitation (server-rendered, cached, revalidated on save) |
| `?g=<code>` | Personalised greeting, filtered events, RSVP prefill, per-guest view count |
| `?preview=<token>` | Draft/any-status preview for customer approval; not counted as a view |
| `/invitation/[slug]/opengraph-image` | Generated preview card |
| `POST /api/rsvp` | Create/update RSVP |
| `POST /api/view` | View ping |

Staff (Cognito, `admin` group, enforced in middleware **and** in every server action/route):
| Route | Purpose |
|---|---|
| `/admin/login` | Email + password; no self-signup; forgot-password flow |
| `/admin` | Dashboard: upcoming events, recent RSVPs, due-for-purge |
| `/admin/invitations` | List, search (couple name, slug, phone), status filter |
| `/admin/invitations/new` | Template picker with live sample previews |
| `/admin/invitations/[id]/edit` | 8-step editor wizard |
| `/admin/invitations/[id]/guests` | Bulk add, per-guest events, links, WhatsApp send, QR, views |
| `/admin/invitations/[id]/rsvps` | Table, per-event headcounts, add RSVP manually, CSV export |
| `/admin/templates` | All templates × palettes with sample data |

Invitation and admin pages use their own layouts, without the marketing site's header and footer. The existing site's pages are unchanged.

**Public resolution rules:**
- unknown slug, or `deleted` → "no longer available" page (HTTP 404)
- `draft` without a valid preview token → same 404 page
- invalid `?g=` → general invitation, no error
- `archived` → Thank-you page

## 7. Code structure

```
src/InvitationModule/
  schema/       zod schema, types, defaults, localisation helpers
  lib/          slug + code generation, guest event filtering, lifecycle date maths,
                RSVP dedupe/deadline logic, media key helpers
  sections/     shared behaviour: Countdown, ScratchReveal, EnvelopeOpen, TapReveal,
                MapEmbed, AddToCalendar, WhatsAppShare, RsvpForm, MusicPlayer,
                Gallery+Lightbox, Film
  templates/
    registry.js          templateId → { component, palettes, sample }
    royal|floral|temple|minimal/
      index.jsx          renders sections by theme.sectionOrder minus hidden
      sections/*.jsx     template-specific presentation
      palettes.js        CSS-variable palettes (--primary, --accent, --bg, …)
      sample.json        sample invitation data
src/AdminModule/        editor wizard, lists, guests, RSVPs, dashboard components
src/app/invitation/…    public routes
src/app/admin/…         staff routes
amplify/                Amplify Gen 2 backend: auth, data, storage, functions (purge job)
```

Templates contain presentation only; behaviour lives in `sections/` and `lib/`. Adding a template = one folder + one registry entry.

## 8. Editor

- Wizard steps: ① Template & palette ② Couple & families ③ Date, venue & travel ④ Events ⑤ Photos, film & music ⑥ Sections ⑦ RSVP & settings (incl. credit toggle, archive settings) ⑧ Review & publish.
- Live phone-frame preview using the same template component as the public page; EN/HI toggle when language is `both`.
- Debounced auto-save (~3 s) with saved/unsaved indicator; navigation guard on unsaved changes.
- Optimistic concurrency via `version`; stale save → "Updated by someone else — reload".
- Pre-publish checklist from schema validation (missing date/venue/event times etc.) blocks publishing.
- Images compressed client-side before upload; video upload with progress bar, ≤ 100 MB; type/size validated client- and server-side.
- Changing template keeps all content.

## 9. Guest experience

- Reveal interaction doubles as the user gesture that starts music; persistent mute button.
- Lazy-loaded gallery via `next/image`; film loads on scroll; YouTube uses a thumbnail facade.
- RSVP: name, phone, attending, guest count, events (only invited ones), meal, message. Honeypot field + rate limit 5/hour per phone and per IP hash. No CAPTCHA. Same guest code or phone → update existing RSVP.
- After the RSVP deadline the form is replaced by a small notice: "RSVPs closed on <date> — for changes, please contact the family: <phone>". Staff can still add/edit RSVPs in admin.
- WhatsApp share button always shares the general link (never the guest code).
- Views: counted per day and per guest; staff sessions and preview-token visits excluded.
- "Created by Baba Saab Events" credit shown unless `showCredit` is false.

## 10. Security

- Cognito user pool, self-signup disabled; staff in `admin` group. The first account (owner) is created with `npm run admin:create -- <email>`; afterwards the owner adds and removes staff from `/admin/staff`, which only the owner role (`owner` group) can open. New staff receive a Cognito email with a temporary password and set their own on first login.
- Data authorisation: Invitation, Guest, ViewCounter — `admin` group read/write only. Rsvp — public create only via the rate-limited server route; read/update admin only.
- Public pages fetch server-side with server credentials and receive a projected public view (no phone numbers, preview tokens, or other guests' data).
- S3: uploads by `admin` only; public read restricted to the media served by invitations; content-type and size limits.
- Preview tokens and guest codes are cryptographically random; preview token regeneration revokes old links.

## 11. Error handling

| Case | Behaviour |
|---|---|
| Upload fails | Inline error + retry; draft unaffected |
| Auto-save fails | Persistent "Unsaved changes" banner, navigation guard |
| Concurrent edit | Save rejected on version mismatch, prompt to reload |
| RSVP rate-limited / invalid | Friendly inline message; no data stored |
| Purge job failure | Logged, retried next run; operations idempotent |
| Missing optional data | Template hides the section rather than rendering empty |

## 12. Testing

- **Unit:** schema validation, slug/code generation, guest event filtering, lifecycle date maths, RSVP dedupe and deadline logic, public-view projection (no private fields).
- **Template:** every template × palette renders `sample.json` without errors; hidden/reordered sections respected; `hi` and `both` languages render.
- **E2E (Playwright):** create → preview link → publish → guest link → RSVP → visible in admin; draft and deleted invitations unreachable publicly; deadline closes the form.
- **Manual QA:** Android Chrome, iOS Safari, WhatsApp preview cards, printed QR codes.

## 13. Staff documentation

Staff who create invitations are non-technical, so the admin panel ships with its own guide.

- **Source:** `docs/admin-guide.md` — a step-by-step staff guide (login, dashboard, details to collect from customers, the 8 editor steps, preview/approval, publishing, guest links, RSVPs, search, lifecycle, deletion, tips). Written for staff, in plain language, with screenshots added in Phase 6.
- **In-app:** `/admin/help` renders the guide; a **Help** item in the admin sidebar and a "?" link on each editor step jump to the matching section.
- **Kept current:** each phase that adds or changes staff-facing behaviour updates the guide in the same change. A phase is not done until its guide sections match what was built.
- **First login:** the dashboard shows a dismissible "New here? Read the 5-minute guide" banner until the staff member dismisses it.

## 14. Build phases

| Phase | Delivers |
|---|---|
| 0 | Amplify Gen 2 backend scaffold, staff auth, `admin:create` script, `/admin/staff` (owner invites/removes staff), `/admin` shell |
| 1 | Schema, shared sections, 4 templates × palettes with sample data, `/admin/templates` |
| 2 | Editor wizard: live preview, auto-save, uploads, sections, languages; Music Library (`/admin/music`) |
| 3 | Public `/invitation/[slug]`, preview links, OG images, QR codes |
| 4 | Guests (bulk, per-event), RSVP, view counts, CSV export |
| 5 | Lifecycle: archive/Thank-you, delete/restore, scheduled purge, S3 cleanup |
| 6 | Hardening: test coverage, mobile QA, performance, guide screenshots, launch checklist |

Each phase gets its own implementation plan, ends in a working, testable state, and updates `docs/admin-guide.md` for anything staff-facing it delivers. Phase 1 needs no AWS access and is built first while AWS permissions are set up; its first task is the Next.js 14 upgrade.

## 15. Prerequisites

- Access to the AWS account that hosts the Amplify app (IAM permissions for Amplify, Cognito, DynamoDB, S3, Lambda).
- Local AWS credentials configured for the Amplify Gen 2 sandbox (`npx ampx sandbox`).
- Confirmation of the Amplify app's branch/build settings (SSR / `WEB_COMPUTE`).
- Owner email for the first `admin` user.
