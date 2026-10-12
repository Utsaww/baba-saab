# Digital Invitations — Phase 2b (Photos, Music & Music Library) Design

**Date:** 2026-10-12
**Status:** Draft for review
**Parent specs (binding):** `docs/superpowers/specs/2026-10-06-digital-invitations-design.md` (§3, §4, §8, §10) and `docs/superpowers/specs/2026-10-08-invitations-phase-2a-editor-design.md` (the editor this extends)

## 1. Scope

- **In 2b:**
  - photo uploads (cover, bride and groom photos, a gallery of up to 12)
  - background music (from the Music Library, or a one-off upload for one invitation)
  - the Music Library page `/admin/music`
  - the S3 storage and delivery behind them
- **Changed from the parent spec:** the invitation film stays **YouTube-only**. Uploading video files (≤ 100 MB) is dropped for now, because of per-view bandwidth cost and slow loading on 4G. It can be added later if customers ask.
- **Out of 2b:** publishing and public links (Phase 3); deleting whole invitations and their folders (Phase 5).

**Done means:**
- Staff can add a cover, couple photos, gallery photos and music to an invitation.
- The phone preview shows the photos and plays the music.
- Staff can manage the shared Music Library.
- Guests' phones will be able to load these files directly (Phase 3 serves the pages).

## 2. Storage and delivery

One Amplify Storage bucket (S3, us-east-1) with two folders:

| Folder | Holds | `admin` group | Anyone |
|---|---|---|---|
| `invitations/<invitationId>/` | cover, couple and gallery photos, one-off music | read, write, delete | read one object by its exact URL |
| `music-library/` | Music Library tracks | read, write, delete | read one object by its exact URL |

- Public read is granted **only** on objects under those two prefixes, through a bucket policy allowing `s3:GetObject`. Listing (`s3:ListBucket`) is never public.
- The bucket's Block Public Access settings allow that policy but still block public ACLs. The account has no account-level Block Public Access (checked 2026-10-12).
- File names are random (UUID + extension), so URLs can't be guessed.
- **Trade-off accepted:** someone who already holds a draft photo's exact URL can open it. The invitation page itself stays private until Phase 3 publishes it.
- Staff upload directly from the browser to S3 with Amplify Storage, using their Cognito credentials. Files never pass through our server.
- The invitation stores **keys** only (parent spec §4). `mediaUrl(key)` turns a key into a URL using `NEXT_PUBLIC_MEDIA_BASE_URL`.
- `next.config.js` reads the bucket name and region from `amplify_outputs.json` at build time. It then:
  - sets `NEXT_PUBLIC_MEDIA_BASE_URL` to `https://<bucket>.s3.<region>.amazonaws.com`, and
  - adds that host to `images.remotePatterns`.

  So every environment (sandbox, preview branch, production) points at its own bucket with no manual environment variables. If the outputs file is missing, the media base stays empty and the build still succeeds.

## 3. Files accepted

| Kind | Accepted | Processing in the browser | Limit |
|---|---|---|---|
| Photos | JPG / JPEG, PNG, WebP, HEIC / HEIF | HEIC/HEIF is converted to JPEG first (converter library loaded only when a HEIC file is picked). Every photo is resized so its longest side is ≤ 2000 px and re-encoded as JPEG at about 0.82 quality (target ~300 KB). Orientation follows the photo's EXIF data. | Original up to 25 MB |
| Music | MP3 (`audio/mpeg`) | None. Duration is read in the browser for display. | 10 MB |

Pixel phones' "PXL_…" files are ordinary JPGs.

Rejected files give a plain message:
- "Use a JPG, PNG, WebP or iPhone photo."
- "Choose an MP3 under 10 MB."
- "That photo is over 25 MB."

## 4. Data

- **Invitation content.** The schema already has `media.coverKey`, `couple.bride.photoKey`, `couple.groom.photoKey`, `media.gallery[{ key, caption? }]` and `media.music { type: library | upload, trackId?, key }`. 2b adds:
  - a maximum of **12** gallery items in the strict schema (`.max(12)`);
  - in the draft cleaner, gallery items beyond 12 are dropped with an error.
- **New model `MusicTrack`.**
  - Fields: `id`, `name`, `key` (under `music-library/`), `durationSec?`, `createdBy`, `createdAt`, `updatedAt`.
  - The `admin` group may create, read, update (name only, enforced in the server action) and delete.
- **New derived column `Invitation.musicTrackId`.**
  - It holds `media.music.trackId` when the music comes from the library, and null otherwise.
  - `indexFields` derives it, and it is passed to `saveInvitation` (resolver and arguments extended).
  - The Music Library uses it to list "used by" invitations.

## 5. Save-time checks (server action)

Before calling `saveInvitation`, the save action also verifies:

1. **Media keys.**
   - Every media key in the draft (`coverKey`, both `photoKey`s, every `gallery[].key`, `music.key`) starts with `invitations/<thisInvitationId>/`.
   - The exception is library music: it must start with `music-library/`.
   - Full `https://` URLs are rejected for staff data; only sample data uses them.
   - If any key fails: "That file doesn't belong to this invitation. Remove it and upload again." Nothing is written.
2. **Library music.**
   - When `music.type === "library"`, the `trackId` must exist.
   - The stored `music.key` is replaced with that track's real key, so the copy can't drift.
   - A missing track gives "That song is no longer in the Music Library — choose another."

## 6. Removing and replacing files

- The editor keeps the keys it has stopped referencing (a replaced cover, a removed gallery photo, replaced one-off music).
- After the **next successful save**, it deletes those objects from S3 with Amplify Storage (staff credentials).
- A failed delete is ignored and logged to the console. The object stays as an orphan until the Phase 5 purge removes the whole invitation folder.
- Files are never deleted before a save that drops them has succeeded, so a failed save can't lose a photo that's still referenced.
- Library tracks are never deleted by the editor, only from the Music Library page.

## 7. Editor step ⑤ — Photos, film & music

Groups, in order:

1. **Cover photo.** One photo, with Upload / Replace / Remove.
2. **Couple photos (optional).** One for the bride and one for the groom, with Upload / Replace / Remove each.
3. **Gallery.** Up to 12 photos.
   - Upload several at once, with a progress bar per photo.
   - Each photo has an optional caption (localised, following the invitation's language), Move left / Move right, and Remove (with confirm).
   - When full: "12 of 12 — the gallery is full" and the upload button is disabled.
4. **Film.** The YouTube link, unchanged from 2a.
5. **Music.** Choose None, From the Music Library, or Upload a song for this invitation.
   - **Library:** a dropdown of tracks, plus a ▶ / ❚❚ preview button.
   - **Upload:** MP3 ≤ 10 MB, with the reminder "Only upload music you have the rights to use."

**Upload behaviour:**
- A photo is added to the invitation only after its upload finishes.
- A failed upload shows "Couldn't upload — Retry" on that item, and the rest of the draft is unaffected.
- The live preview shows each photo and the music as soon as it's added.
- The leave guard (2a) also treats an upload in progress as unsaved work: following a link prompts, and closing the tab warns.

## 8. Music Library — `/admin/music`

A new sidebar item, **Music**, for all staff.

- **List:** name, length (m:ss), "Added by <email> · <date>", a ▶ / ❚❚ play button, and "Used by: Priya & Rahul, …" (or "Not used yet").
- **Add a track:** choose an MP3 (≤ 10 MB) and enter a name (required; defaults to the file name without its extension), then **Upload**.
  - The reminder "Only upload music you have the rights to use." is shown.
  - The file goes to `music-library/<uuid>.mp3`, then a `MusicTrack` record is created.
  - If creating the record fails after upload, the uploaded file is deleted.
- **Rename:** inline edit of the name.
- **Delete:**
  - Allowed only when no invitation uses the track. Otherwise: "Used by N invitations — change their music first."
  - On delete, the record is removed and then the S3 file.
  - The server action re-checks "used by" before deleting, not just the page.

## 9. Errors

| Situation | Behaviour |
|---|---|
| Unsupported photo or music type, or too large | Plain message; nothing uploaded |
| HEIC conversion fails | "Couldn't read that iPhone photo — export it as JPG and try again." |
| Upload fails (network or permissions) | That item shows Retry; draft unaffected |
| Gallery full | Upload disabled, with a message |
| Save with a key from another folder | Save rejected, with a plain message (§5) |
| Library track deleted while selected in an open editor | Next save is rejected with "That song is no longer in the Music Library — choose another." |
| Deleting a track in use | Blocked, with a message |
| Leaving during an upload | Leave guard prompts or warns |

Raw AWS errors are logged and never shown.

## 10. Testing

- **Unit:**
  - photo processing decisions (target size, longest side, quality, HEIC detection), with canvas and converter faked
  - file type and size checks
  - media-key validation (own folder, other invitation, library, `https://`)
  - working out which keys to delete after a save
  - `indexFields` with `musicTrackId`
  - "used by" grouping
  - the gallery max of 12 in both schemas
- **Component:**
  - step ⑤: upload progress and retry, reorder, remove, the 12 limit, captions in both languages, music choice and preview
  - the Music Library: add, rename, play, blocked delete, empty state
- **Backend unit:** the `saveInvitation` resolver with `musicTrackId`.
- **Sandbox (real AWS):**
  - upload a photo, then fetch it by URL while signed out (200)
  - listing the bucket while signed out is refused (403)
  - a signed-in non-admin can't upload
- **Manual (preview branch):** a full invitation with photos and music in all four designs on a phone-sized screen; the preview shows photos and plays music; a HEIC photo uploads; the Music Library add / rename / delete flows work.

## 11. Staff guide

- Update **Editor step 5** for photos and music (formats, iPhone photos, the 12-photo limit, captions, music choices, the rights reminder).
- Add a **Music Library** section.
- Add **Music** to the "What you can do right now" table.
