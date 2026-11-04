# Invitation video — "Download video" in admin

Builds on: digital invitations (`2026-10-06-digital-invitations-design.md`), lifecycle (offline/erase), invitation customisation (`2026-11-03-invitation-customisation-design.md`).

## 1. Why

Staff share each live invitation on WhatsApp and Instagram from their phones. A link alone doesn't show the design moving; a short video does. Today staff would have to screen-record by hand (uneven scrolling, status bar and notifications in the shot). The owner wants a button in admin that produces a ready-to-post MP4.

**Success:** a staff member presses one button on a live invitation and, within about two minutes, has a phone-shaped MP4 with the invitation's music. It plays the opening and moves through the page like a smooth, deliberate demo. It never runs past 60 seconds, so WhatsApp status and Instagram stories never cut it.

## 2. Decisions (owner, 2026-11-04)

| # | Decision |
|---|---|
| V1 | A **Download video** button in admin, made in the cloud (not a script on a laptop). |
| V2 | Used by the admin team, who share it on WhatsApp and Instagram from mobile. |
| V3 | Includes the **music attached to the invitation**. |
| V4 | **Length follows the content, at most 60 seconds.** |
| V5 | **Pauses on the important parts** (couple's names, date, events) and moves quickly through the rest. |
| V6 | **Only for published, live invitations.** No video from drafts or offline invitations. |
| V7 | The owner accepted the staff flow played back on 2026-11-04 (§5). |

## 3. Goals, non-goals, anti-goals

**Goals:** one-click MP4 of the live invitation; 9:16 phone frame; opening transition plays; section animations play as they come into view; music with fade-out; content-based length ≤ 60 s; cached until the live copy changes.

**Non-goals:** videos of drafts or offline invitations; per-guest videos (guest name from `?g=`); choosing length, sections, music or speed per video; captions/text overlays, intro/outro cards or a watermark beyond the invitation's own credit; landscape or square formats; posting to WhatsApp/Instagram for staff; a laptop script.

**Anti-goals (failure even if it "works"):**
- A video showing details that differ from the live invitation.
- Jerky or stuttering motion that makes the design look cheap.
- A video longer than 60 s.
- Cut-off text, or the admin/preview banner, cookie bar or browser UI in the frame.
- Any change to what guests see on the public page.
- An RSVP counted or a guest visit faked by the recording.
- Staff stuck on a spinner with no outcome. Every attempt ends in a file or a clear error with a retry.

## 4. What exists (read before planning)

- **Public page:** `src/app/(invite)/invitation/[slug]/page.js` renders `publishedContent` through `InvitationRenderer` → `TemplateFrame`. Data comes from `invitation-public` (read-only Lambda).
- **Opening:** `sections/OpeningOverlay.jsx`. Openings are tap, scroll or scratch (`sections/reveals/ScratchReveal.jsx`; Temple `templates/temple/ScratchDate.jsx`; Royal scratch card). Each template sets which one it uses.
- **Music:** `sections/useMusic.js` and `MuteButton`. The track is `content.media.music.key` in S3. `invitations/*` and `music-library/*` are public-read by exact URL (bucket policy in `amplify/backend.ts`).
- **Reveal animations:** IntersectionObserver-based reveals in the templates (and `aos` in dependencies). They fire on scroll.
- **Invitation record** (`amplify/data/resource.ts`): `status`, `slug`, `publishedContent`, `liveVersion`, `liveUpdatedAt`. `liveVersion` goes up on every "Update live invitation", so it is the cache key.
- **Admin menu:** `src/AdminModule/editor/lifecycle/InvitationMenu.jsx` (Take offline, etc.).
- **Erase:** `invitation-lifecycle` deletes everything under `invitations/<id>/`, so a video stored there is erased with the invitation for free.
- **Existing functions** are Node Lambdas defined with `defineFunction` (see `amplify/functions/*/resource.ts`), with least-privilege IAM written by hand in `backend.ts`. Follow that style.

## 5. Staff experience

1. **Button.** The menu shows **Download video** only when the invitation is live. It is hidden on drafts and on offline or deleted invitations.
2. **Making.** Pressing it starts a job and the button shows **Making video…**, with a short note that it takes 1–2 minutes. Staff can keep working, leave the page or come back. On return, the button shows the current state: still making, ready, or failed.
3. **Ready.** The button becomes **Download MP4**. The file is named after the couple and ends in `-invitation.mp4`, e.g. `rahul-priya-invitation.mp4`. The browser downloads it, and on a phone the file can then be shared to WhatsApp and Instagram.
4. **Cached.** If a video already exists for the current `liveVersion`, the button downloads it at once. After "Update live invitation" the old video no longer counts, and the next press makes a new one. Old videos for that invitation are replaced, not kept.
5. **Failed.** Staff see "Couldn't make the video. Try again." with a retry. A job that hasn't finished in 5 minutes counts as failed, so the button never spins forever.
6. **Double press, or two staff pressing at once:** one job runs, and both see it.
7. **Erased:** the video goes when the invitation's files are erased (§4).

## 6. The video

- **Frame:** 9:16 portrait at **1080×1920**, rendered from a phone-width viewport (e.g. 390–412 CSS px wide at device-scale 2.6–2.75, or as close as the renderer allows). H.264 MP4 with AAC audio, `faststart`, so it plays on WhatsApp/Instagram on Android and iOS. Target 30 fps. The file is small enough for WhatsApp (≤ 16 MB is the safe target).
- **Content:** the live public page as a first-time guest sees it, with no guest token. Hindi or bilingual as published. Customisation (wording, styles, colours, date style) applies automatically because it is the real page.
- **No foreign UI.** No preview banner, cookie or install prompts, mute-button tooltip or browser chrome. The mute button itself may show, since guests see it.
- **Sequence:**
  1. A short hold on the closed opening (about 1.5 s).
  2. The opening action plays as a guest would do it (tap, scroll or a scripted scratch stroke) and its transition runs to the end.
  3. The page scrolls top to bottom with eased motion. It pauses on the **couple's names** (cover and couple section), the **date / save-the-date**, and **each event card**, and moves quickly through everything else.
  4. It ends on the closing section ("Warm regards" and the families) with a ~2 s hold. It does not end on the RSVP form; the credit, if shown, may appear in the last frames.
- **Length (V4):** computed from the content. The time = holds + pauses (per important item) + scroll distance ÷ speed. It is never longer than **60 s**, and never shorter than **about 20 s** (owner accepted this guess). When the natural time is over 60 s, scroll speed goes up first; pauses shrink last, down to a floor (e.g. 1 s each), so every important item still registers. Exact numbers are the builder's call.
- **Music (V3):** the invitation's track from the start of the opening, as on a guest's phone, with a ~2 s fade-out at the end. It is mixed in after recording (a browser recording is silent). No music attached → silent video.
- **Side effects:** the recording must not create RSVPs and must not bump any visit or reply counters. Today no visit counter exists; if one is added later, the recorder must be excluded.

## 7. How it gets made (decided)

- Made in the cloud, on AWS in the existing Amplify app (V1). Started from admin, and only staff (`admin` group) can start or download.
- It runs as a background job: the browser has to play the page in real time, which takes longer than a normal request may.
- The MP4 is stored under `invitations/<id>/` (so erase covers it) and downloaded by staff.

## 8. Left to the builder

- **The rendering approach**, which is the main technical risk. It has to give smooth 30 fps motion of CSS/JS animations inside a cloud function. The options:
  - Real-time capture (Playwright video / CDP screencast) on a large-memory Lambda.
  - Frame-by-frame capture with controlled time (virtual time, or a time-stepped page mode).
  - A container task (Lambda container image / Fargate) if a zip Lambda can't hold Chromium + ffmpeg.

  **Start with a throwaway spike** that renders one real invitation per template opening type and judge it against the anti-goals before building the rest.
- How the recorder finds the important items: e.g. `data-video-pause` markers on the cover names, date and event cards, added without changing guest-visible output. The baseline snapshots must stay unchanged; if markers would change them, find another way (e.g. existing section ids/classes).
- How the scratch openings are driven (a scripted pointer stroke, or a recorder-only reveal of the same animation).
- The job mechanics:
  - how the job is started and its status stored (e.g. fields on `Invitation` such as video status / liveVersion / key / startedAt, or a small separate model)
  - how admin learns it's done (polling while the page is open is fine)
  - how the download link is given (signed URL or the public-by-key URL; the content is already public, but the key must not be guessable from the slug alone)
- Exact pause/scroll/hold numbers within §6.
- Memory, timeout and region settings, and the per-video cost (owner was told roughly ₹2 per video).
- Whether the invitation-menu entry is a menu item or a button nearby, in the existing admin style.

## 8a. Answers to the builder check (my calls unless marked)

- **Which URL the recorder loads:** the public invitation page (`/invitation/<slug>`) on the same deployment that started the job, so a preview branch records its own preview site. The origin is given to the job by the server side of admin and must match the expected hosts (the app's branch domains and the custom domain); it is never taken from raw user input. The page is public, with no auth or bot protection today, so the recorder is a plain browser visit and needs no direct table access.
- **Recorder-only page flag:** allowed. A query flag (e.g. `?video=1`) may hide the preview banner, the mute tooltip and other non-invitation UI, and may switch on a time-stepped mode. **Guests without the flag must see exactly what they see today**, and the baseline snapshots must stay unchanged. Checked: the page has no analytics or visit tracking today, and the RSVP form only writes on submit, which the recorder never does.
- **Container fallback:** pre-approved if the spike shows a zip Lambda can't do it. Owner was told "roughly ₹2 per video". Anything up to about ₹10 per video is fine; above that, ask the owner first.
- **Live copy changes mid-job:** the video is tagged with the `liveVersion` read when the job starts. If "Update live invitation" happens before the job finishes, the finished video counts as stale: it is never offered, and the next press makes a new one. If the invitation goes offline mid-job, the job may finish, but the button stays hidden until the invitation is live again.
- **Music:** the guest page loops the track (`useMusic.js` sets `loop = true`). The video does the same: loop if the track is shorter than the video, start at 0, ~2 s fade-out. A missing or unreadable track gives a silent video plus a note on the button ("Made without music: the track couldn't be read"), not a failed job.
- **On-screen elements:** the mute button and the invitation's own credit (when `showCredit`) may appear, because guests see them.

## 9. Testing

- **Unit:**
  - length calculation: short, normal and very long invitations; always 20–60 s; pauses floor
  - cache rule (same `liveVersion` → reuse; changed → remake)
  - state transitions (none → making → ready/failed; 5-minute timeout → failed)
  - permission: only live invitations; non-staff refused
  - file-name generation (Hindi/long/odd names → safe ASCII name)
- **Render:** the baseline snapshots are unchanged. The menu shows the button only when live and shows each state.
- **Manual on the preview branch:** one video per template (all 5, covering tap/scroll/scratch openings), one Hindi, one with no music, one long invitation (many events + full gallery) to check the 60 s cap. Watch on an Android and an iPhone in WhatsApp status and an Instagram story.

## 10. Staff guide

`docs/admin-guide.md`: a "Download a video" section covering when the button appears, the 1–2 minute wait, that the video updates after "Update live invitation", and how to share the file from a phone.
