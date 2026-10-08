# Digital Invitations — Phase 2a (Editor) Design

**Date:** 2026-10-08
**Status:** Draft for review
**Parent spec:** `docs/superpowers/specs/2026-10-06-digital-invitations-design.md` (binding; this document only settles Phase 2a decisions)

## 1. Scope

Phase 2 of the parent spec (§14) is split in two:

- **2a (this document):** invitation storage, the Invitations list, the new-invitation picker, the 8-step editor for every text detail, a YouTube film link, live preview, auto-save with conflict detection, and the publish checklist.
- **2b (later):** photo, video and one-off music uploads to S3, and the Music Library (`/admin/music`).

**Out of 2a:** slugs, publishing and public links (Phase 3); guests and RSVPs (Phase 4); delete, archive and purge (Phase 5).

**Done means:** a staff member can create an invitation, fill in every text detail, see it live in a phone preview, leave and come back to it, and see what is still missing before publishing. Nothing is lost on a failed save, and two people editing never silently overwrite each other.

## 2. Storage

One Amplify Data model, `Invitation`, stored in DynamoDB:

| Field | Type | Purpose |
|---|---|---|
| `id` | id | Generated on create |
| `status` | string | Always `draft` in 2a |
| `templateId` | string | `royal`, `floral`, `temple` or `minimal` |
| `mainDate` | string, optional | `YYYY-MM-DD`, for sorting |
| `coupleNames` | string | Display label, e.g. "Priya & Rahul"; "Untitled invitation" when no names yet |
| `searchText` | string | Lower-case bride and groom names (en and hi) and contact phone |
| `content` | JSON | The whole invitation; validated by the zod schema |
| `version` | integer | 1 on create, +1 on each save |
| `createdBy`, `updatedBy` | string | Staff email |
| `createdAt`, `updatedAt` | datetime | Set by Amplify / the save resolver |

- `content` is the single source of truth for invitation details. The other fields are derived from it on every save by one pure function, `indexFields(content)`, so they can never disagree with it.
- Authorisation: the `admin` group may **create** and **read** `Invitation`. Model-level **update** and **delete** are not granted to anyone.
- Every change goes through one custom mutation, `saveInvitation(id, expectedVersion, content, templateId, mainDate, coupleNames, searchText)`, restricted to the `admin` group. It is an AppSync JavaScript resolver on the Invitation table that writes only if the stored `version` equals `expectedVersion`, increments `version`, and sets `updatedAt` and `updatedBy` (from the caller's identity). A version mismatch returns a distinct error the app shows as "Updated by someone else — reload".
- Listing reads all invitations (paginated) and filters/sorts on the server. That is fine for hundreds of invitations; an index can be added later without changing the screens.

## 3. Validation

The parent spec's zod schema stays the single source of truth, in two forms:

- **Draft schema:** every field optional except `templateId` and `theme.palette`. Every save is validated against it, so a half-finished invitation always saves. A field that fails its own rule (for example a malformed Maps link or a time like `25:00`) shows an inline hint and is stored as blank, so it never blocks the rest of the save.
- **Publish schema:** the existing strict schema. In 2a it only feeds the step ⑧ checklist. Each failure becomes a plain sentence that links to the step that fixes it, e.g. "Add the wedding date" (→ step ③) or "Add a time for Sangeet" (→ step ④).

Required languages follow `language`: for `both`, a name needs both English and Hindi to pass the publish check. A draft can have either.

## 4. Screens

All staff screens use the existing `(staff)` layout and `requireStaff()`.

### `/admin/invitations` — list
- One row per invitation: couple names, template, wedding date, status, and "edited <relative time> by <email>". Newest edit first.
- A search box matches couple names (either language) and phone. A status filter (only Draft has rows in 2a).
- A **New invitation** button. The sidebar's "Invitations · coming soon" item becomes **Invitations**.
- Empty state: "No invitations yet" with a **New invitation** button.

### `/admin/invitations/new` — picker
- The four template cards with live sample previews (reusing the gallery's phone frames).
- Choose a template, a palette and a language (English / हिंदी / Both), then **Create**. This creates a draft (version 1) and opens the editor at step ②.

### `/admin/invitations/[id]/edit` — wizard
- **Steps** (parent spec §8): ① Template & palette ② Couple & families ③ Date, venue & travel ④ Events ⑤ Photos, film & music ⑥ Sections ⑦ RSVP & settings ⑧ Review.
- **Layout:** a step list on the left with a ✓ on each step that has content; free navigation in any order (`?step=N` in the URL); the form in the middle; the phone preview on the right. Below `lg` width the preview sits behind a **Preview** button.
- **Localised fields** show English, Hindi, or both side by side, following the invitation's language.
- **Step ⑤ in 2a** offers the film as a YouTube link only. Photos and music show "Coming soon".
- **Step ⑧** shows the publish checklist. **Publish** is visible but disabled, labelled "Publishing arrives in the next release".
- Changing the template keeps all content (parent spec §8). Changing the language never deletes text already entered in the other language.
- An unknown id shows "This invitation doesn't exist" with a link back to the list.
- Each step has a "?" link to its section of the staff guide.

## 5. Live preview

- A phone-sized iframe loads `/admin/preview-frame`. This is a staff-only page (middleware plus `requireStaff()`) with no admin shell, so template styles stay isolated from the editor.
- The editor sends the current draft to the frame with `postMessage` (same origin only) on every change. The frame renders it with the same `InvitationRenderer` guests will see.
- The opening animation is skipped in this mode, so it doesn't replay on every keystroke.
- Required values that are still blank (names, main date, venue name) are filled from the template's sample invitation, under a small banner: "Sample details shown where you haven't filled in yet". Optional sections with no content stay hidden, as they do on the real page.
- When the language is `both`, an EN / HI toggle above the frame switches what the preview shows.
- If the frame fails to load, the form still works and the frame area says "Preview unavailable — reload the page".

## 6. Auto-save

- Saves about 3 seconds after the last change, through a server action that runs `requireStaff()`, validates against the draft schema, computes `indexFields`, and calls `saveInvitation`.
- The indicator reads **Saving…**, **Saved HH:mm** or **Unsaved changes**.
- **Save failure:** a persistent "Couldn't save — Retry" banner. The form keeps everything, and leaving the page (link or browser close) asks for confirmation.
- **Version conflict:** "Updated by someone else — reload" with a **Reload** button. Auto-save pauses until the page is reloaded, so nothing is overwritten.
- The save logic (debounce, in-flight, queued change, failure, conflict) lives in one small reducer, so it can be tested without timers or a network.

## 7. Errors

| Situation | Behaviour |
|---|---|
| Save fails (network, AWS) | Persistent Retry banner; data kept; leave-page guard |
| Stale version | Reload banner; auto-save paused |
| Malformed request to an action | Rejected with a plain message; nothing written |
| Unknown invitation id | Not-found page with a link to the list |
| Preview frame error | Form unaffected; "Preview unavailable — reload the page" |

Raw AWS errors are logged on the server and never shown.

## 8. Testing

- **Unit:**
  - draft and publish schemas
  - the publish checklist mapping (error → sentence → step)
  - `indexFields`
  - list search and filter
  - the auto-save reducer
  - the preview's sample fallback
  - the `saveInvitation` resolver's request and response logic
- **Component:**
  - each wizard step: the fields shown per language, and that edits update the draft
  - the list (search, filter, empty state)
  - the picker
  - the auto-save indicator and banners
- **Sandbox (real AWS):** create, save, a stale save is rejected, and a signed-in user outside the `admin` group is refused.
- **Manual:**
  - build a full invitation in each template
  - open it in two tabs to trigger the conflict
  - go offline to trigger the Retry banner
  - check the preview on a phone-width screen

## 9. Staff guide

New sections in `docs/admin-guide.md`: **Invitations list**, **Creating an invitation**, and one section per editor step, each linked from that step's "?". The "What you can do right now" table gains **Invitations**.
