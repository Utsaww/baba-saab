# Invitation Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a **Download video** button in the invitation editor that makes and downloads a 9:16 MP4 of the live invitation, with its music, at most 60 s long.

**Architecture:** There are two Lambdas.

- **`invitation-video`** is a small AppSync handler, defined with `defineFunction` in the data stack. It owns the job state on the `Invitation` record, starts render jobs and returns status plus a download link.
- **`InvitationVideoRender`** is a large CDK `NodejsFunction`, created inside the data stack in `amplify/backend.ts`. It runs headless Chromium (`@sparticuz/chromium` + `playwright-core`) and records the public page with a CDP screencast. It cuts the MP4 with ffmpeg, adds the music, uploads to S3 and writes the result back.

The page motion follows a pure timeline function, so the length rules are unit-tested.

**Tech Stack:**
- Amplify Gen 2 (CDK escape hatch in `backend.ts`)
- AWS Lambda Node 20 x86_64, with a Lambda layer built in the Amplify build by CDK local bundling (no Docker)
- `@sparticuz/chromium`, `playwright-core`, `ffmpeg-static`
- DynamoDB DocumentClient, S3 presigned GET
- Next.js 14 server actions, React, Tailwind, Vitest

**Spec:** `docs/superpowers/specs/2026-11-04-invitation-video-design.md`. Read §5, §6, §8a and §8b before any task.

## Global Constraints

- **Branch:** `feature/invitation-video`.
  - Never commit or merge to `main`.
  - Ask the owner before every `git push`.
  - Never stage `amplify_outputs.json`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Guests must see exactly what they see today. The 30 baseline snapshots in `src/InvitationModule/templates/__snapshots__/baseline.test.jsx.snap` must not change. Never run vitest with `-u`.
- **Only live invitations:** `status === "published"`. Only the `admin` Cognito group may start a video or download one.
- **Video format:** 1080×1920, H.264 `-crf 18 -preset medium`, `yuv420p`, 30 fps, AAC 192k, `-movflags +faststart`.
- **Recording viewport:** 405×720 CSS px, `deviceScaleFactor: 8/3`, `isMobile: true`, `hasTouch: true`. Screencast JPEG quality 85, `maxWidth: 1080, maxHeight: 1920`.
- **Pace:**
  - glide 250 px/s, with ease-in-out per glide (`x<.5 ? 2x² : 1-(-2x+2)²/2`) and a minimum glide of 400 ms
  - hold 1.2 s per stop, holds floor 0.8 s
  - closed-opening hold 1.5 s, then the opening transition, then 3 s
  - final hold 2 s, music fade-out 2 s
- **Length:** total 20 s ≤ length ≤ 60 s.
- **Stops,** in page order:
  1. `[class*="coverNames"]`
  2. the `[class*="base_couple"]` block (centre of the span from the first to the last match)
  3. `[class*="bigDate"]`
  4. each `li[class*="base_event"]`

  The end is the bottom of the last `section`, aligned to the viewport bottom + 40 px, clamped to the max scroll.
- **Storage:** the video key is `invitations/<id>/video/<uuid>.mp4`. Random, because `invitations/*` is public-read. The download name is `<slug>-invitation.mp4`.
- **Job timeout:** a `making` job older than **5 minutes** counts as `failed`. The render Lambda timeout is 290 s, so a job always finishes or dies before it is declared failed.
- **Cost:** about ₹2 per video expected; up to ₹10 is fine; above that, stop and ask the owner.
- **Code style:** match the surrounding code: comment density, naming, hand-written least-privilege IAM in `backend.ts`.

## Review Focus

1. **Update live while a video is being made** → the finished video must not be offered (stale `liveVersion`). Pinned in Task 3 (`status` test "stale video after Update live").
2. **Two staff pressing at once / double click** → exactly one render starts. Pinned in Task 3 (`start` test "second start while making returns making, no invoke").
3. **A render that crashes or times out** → staff see "failed" with retry, never an endless spinner. Pinned in Task 3 ("making older than 5 min reads as failed") and Task 2 (render writes `failed` on error).
4. **Old job finishing after a newer job started** → it must not overwrite the newer result. Pinned in Task 2 (`finishJob` conditional on `videoJob`).
5. **Very long invitations** (12 events, full gallery) → still ≤ 60 s, every stop still held ≥ 0.8 s. Pinned in Task 1 (`timeline` tests).

---

### Task 1: Timeline (pure length and pace rules)

**Files:**
- Create: `amplify/functions/invitation-video-render/timeline.ts`
- Test: `amplify/functions/invitation-video-render/timeline.test.ts`

**Interfaces:**
- Produces: `buildTimeline(input: { stops: number[]; end: number }): Timeline`
  - `type Timeline = { speed: number; hold: number; finalHold: number; targets: number[]; total: number }`, all times in seconds.
  - `targets` = sorted, de-duplicated (rounded) `stops` with values `< 0` clamped to 0, followed by `end`.
  - `total` = intro (1.5 + 3) + Σ glide time + hold × (targets.length − 1) + finalHold.
  - A glide's time is `max(0.4, |Δ| / speed)`.

- [ ] **Step 1: Write the failing tests**
  - `"approved pace when it fits"`: `buildTimeline({ stops: [0, 778, 1049, 2171, 2454, 2736, 3019, 3289], end: 5455 })` gives `speed === 250`, `hold === 1.2`, `finalHold === 2`, and `total` between 40 and 50.
  - `"never over 60 s; speeds up before shrinking holds"`: 12 stops spread over 30000 px. Expect `total <= 60`, `hold >= 0.8`, `speed > 250`.
  - `"holds shrink only after speed alone can't fit"`: 60 stops 10 px apart (glides already at the 0.4 s minimum), `end: 700`. Expect `total <= 60` and `hold < 1.2`, `hold >= 0.8`.
  - `"short page is stretched to 20 s by the final hold"`: `stops: [0], end: 300`. Expect `total === 20` and `finalHold > 2`.
  - `"duplicate and negative stops collapse"`: `stops: [-5, 0, 0, 400]`, `end: 400` gives `targets` equal to `[0, 400, 400]`. The end stays last even when it equals a stop.

- [ ] **Step 2: Run** `npx vitest run amplify/functions/invitation-video-render/timeline.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement `buildTimeline`**

  Order of fitting:
  1. Compute at speed 250 / hold 1.2.
  2. If `total > 60`, raise the speed until it fits; solve directly or step ×1.1.
  3. If the speed has no effect any more (all glides at the 0.4 s minimum), lower the hold, but not below 0.8.
  4. If `total < 20`, add the difference to `finalHold`.

  If it still cannot fit 60 at floor holds and minimum glides, return it as is. A comment notes this needs more than ~70 stops, which no real invitation has.

- [ ] **Step 4: Run the test.** Expected: PASS.

- [ ] **Step 5: Commit** `feat(video): timeline with the approved pace and 20–60 s length`.

### Task 2: Render Lambda, and proving it in AWS

**Files:**
- Create:
  - `amplify/functions/invitation-video-render/handler.ts`: the entry
  - `amplify/functions/invitation-video-render/record.ts`: the browser part
  - `amplify/functions/invitation-video-render/encode.ts`: the ffmpeg argument builder plus running it
  - `amplify/functions/invitation-video-render/job.ts`: the DynamoDB/S3 writes
  - `amplify/functions/invitation-video-render/encode.test.ts`
  - `amplify/functions/invitation-video-render/job.test.ts`
  - `amplify/layers/video/package.json`: the layer's dependencies, pinned to exact versions. Pick a `@sparticuz/chromium` major that matches the Chromium of the chosen `playwright-core` version per sparticuz's compatibility table. Also `ffmpeg-static@5.2.0`.
- Modify: `amplify/backend.ts` (the function, layer, IAM and env)

**Interfaces:**
- Consumes: `buildTimeline` (Task 1).
- Produces:
  - Render event: `{ id: string; slug: string; liveVersion: number; job: string; musicKey?: string }`.
  - `amplify/backend.ts` exposes the render function so Task 3 can call `renderFn.grantInvoke(...)` and set `VIDEO_RENDER_FUNCTION` to `renderFn.functionName`.
  - `job.ts` exports:
    - `finishJob(db, table, { id, job, key, note? }, now): Promise<boolean>` sets `videoStatus="ready", videoKey, videoNote, videoFinishedAt`. It is conditioned on `videoJob = :job` and returns `false` when the condition fails.
    - `failJob(db, table, { id, job }, now)` sets `videoStatus="failed"` under the same condition, and swallows a failed condition.
  - `encode.ts` exports:
    - `ffmpegArgs({ listFile, musicFile?, seconds, out }): string[]`
    - `concatList(frames: { file: string; t: number }[]): string`, using the same duration rule as the spike: last frame 1/30 s.

- [ ] **Step 1: Write the failing tests**
  - `encode.test.ts`:
    - `"video only"`: args contain `-f concat`, `-crf 18`, `-preset medium`, `-pix_fmt yuv420p`, `+faststart`, `-an`, and a `-t` equal to `seconds`.
    - `"with music loops and fades"`: args contain `-stream_loop -1` before the music input, `-c:a aac`, `-b:a 192k`, and a filter `afade=t=out:st=${seconds-2}:d=2`.
    - `concatList` turns a frame at t=0 and one at t=0.5 into `duration 0.5000` then `duration 0.0333`.
  - `job.test.ts`, with a fake `db.send` that records commands and throws `ConditionalCheckFailedException` on demand:
    - `"finishJob writes ready only for its own job"`: the condition expression includes `videoJob = :job` and the values include the key and note.
    - `"finishJob returns false when a newer job owns the record"`: the db throws the condition error → `false`.
    - `"failJob ignores a lost condition"`: does not throw.

- [ ] **Step 2: Run** `npx vitest run amplify/functions/invitation-video-render`. Expected: FAIL.

- [ ] **Step 3: Implement `encode.ts` and `job.ts`** to pass the tests.

- [ ] **Step 4: Implement `record.ts`.**

  `record({ url, tmpDir }): Promise<{ frames: {file,t}[]; seconds: number }>` ports the approved spike script `scratchpad/phonecheck/video.mjs`. Its logic is in spec §8b. Its pieces:
  - Launch with `chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args })`, using the viewport from Global Constraints.
  - `goto(url, { waitUntil: "networkidle" })`, then `document.fonts.ready`, then wait 2.5 s for React to hydrate.
  - Start the screencast and hold 1.5 s.
  - Open: click the last button in `[role="dialog"]`. If a `canvas` is still in the dialog after 1 s (a scratch opening), drag a zig-zag pointer stroke across it (8 passes, 400 ms), then wait 3 s.
  - Measure the stops in the page with the selectors from Global Constraints, call `buildTimeline`, and run the glide/hold loop in the page as the spike did, using `timeline.speed` and `timeline.hold`.
  - Hold `finalHold`, then stop.

- [ ] **Step 5: Implement `handler.ts`.**

  The page URL is `${process.env.VIDEO_SITE_ORIGIN}/invitation/${slug}`. The steps:
  1. Download the music by exact public URL, using `mediaUrl`'s rule (`https://<bucket>.s3.<region>.amazonaws.com/<key>`; check `src/InvitationModule/lib/media.js`). If it fails, continue without music and set `note: "Made without music: the track couldn't be read"`.
  2. Record.
  3. Write `concatList`.
  4. Run ffmpeg (`ffmpeg-static` path).
  5. `PutObject` to `invitations/<id>/video/<randomUUID()>.mp4` with `ContentType: video/mp4`.
  6. `finishJob`.
  7. If `finishJob` returned true, delete the previous `videoKey` (read it before finishing); if false, delete the file just uploaded.

  Any throw → `failJob`, then rethrow. Clear `/tmp/video` at the start and the end.

- [ ] **Step 6: Wire `backend.ts`.**
  - Create the function with `new NodejsFunction(Stack.of(tables["Invitation"]), "InvitationVideoRender", { … })`. Put it in the data stack: the start function (data stack) must reference it, and a separate stack would make a circular dependency.
  - Function settings:
    - runtime `NODEJS_20_X`
    - `memorySize: 10240`; if the deploy says the account cap is 3008, use 3008 and note it in the ledger
    - `timeout: Duration.seconds(290)`
    - `ephemeralStorageSize: Size.gibibytes(4)`
    - `bundling.externalModules: ["@sparticuz/chromium", "playwright-core", "ffmpeg-static", "@aws-sdk/*"]`
  - The layer is a `LayerVersion` from `Code.fromAsset("amplify/layers/video", { bundling: { image: DockerImage.fromRegistry("none"), local: { tryBundle(out) { execSync("npm ci --omit=dev", { cwd: "amplify/layers/video" }); copy node_modules to `${out}/nodejs/node_modules`; return true; } } } })`, so it needs no Docker.
  - Commit a `package-lock.json` for the layer, generated with `npm i --package-lock-only` in that folder.
  - IAM, written by hand like the rest of `backend.ts`:
    - `dynamodb:GetItem, UpdateItem` on the Invitation table only
    - `s3:PutObject, s3:DeleteObject` on `invitations/*/video/*` only
  - Env: `INVITATION_TABLE`, `INVITATION_MEDIA_BUCKET`, and `VIDEO_SITE_ORIGIN`. The origin is `process.env.VIDEO_SITE_ORIGIN` if set at synth time, else `https://${AWS_BRANCH with "/" → "-"}.${AWS_APP_ID}.amplifyapp.com`, the build env Amplify provides. If neither exists (local sandbox), throw at synth with a clear message.

- [ ] **Step 7: Run** `npx vitest run amplify` and `npx tsc -p amplify --noEmit`. Expected: all pass, no type errors.

- [ ] **Step 8: Commit** `feat(video): render Lambda (Chromium screencast → MP4 with music)`.

- [ ] **Step 9: Prove it in AWS (gate).**
  1. Ask the owner to approve a push of `feature/invitation-video` and to connect the branch in Amplify, as with the customisation branch.
  2. After the deploy, invoke the render function directly for each sample. Use `aws lambda invoke` with a published test invitation per template: ask the owner for slugs, or publish samples with their login on the preview pool. Pass a dummy `job`. `finishJob` will return false and the file will be deleted, so for this proof, temporarily log the uploaded key and skip the delete via env `VIDEO_KEEP_ORPHAN=1`. Remove that before Task 3.
  3. Download the five MP4s and check: smooth motion, stops centred, opening played, music present. Check the duration and the CloudWatch billed duration × memory for cost.
  4. Show the owner the videos.

  If Chromium can't launch, or the motion stutters on Lambda, stop and report. The fallback (a container image) needs a ruling and possibly the owner.

### Task 3: Start and status API (`invitation-video`)

**Files:**
- Create:
  - `amplify/functions/invitation-video/resource.ts`: `defineFunction({ name: "invitation-video", entry: "./handler.ts", timeoutSeconds: 10, resourceGroupName: "data" })`
  - `amplify/functions/invitation-video/handler.ts`
  - `amplify/functions/invitation-video/video.ts`: the state rules
  - `amplify/functions/invitation-video/video.test.ts`
  - `amplify/functions/invitation-video/handler.test.ts`
- Modify:
  - `amplify/data/resource.ts`:
    - new fields on `Invitation`: `videoStatus: a.string(), videoJob: a.string(), videoLiveVersion: a.integer(), videoKey: a.string(), videoNote: a.string(), videoStartedAt: a.datetime(), videoFinishedAt: a.datetime()`
    - two operations, both `allow.group("admin")` and both handled by `invitationVideo`:
      - mutation `makeInvitationVideo(id: ID!) → a.json()`
      - query `invitationVideoStatus(id: ID!) → a.json()`
  - `amplify/backend.ts`: register `invitationVideo`. Give it these, written by hand:
    - `dynamodb:GetItem, UpdateItem` on Invitation
    - `s3:GetObject` on `invitations/*/video/*` (for the presign)
    - `renderFn.grantInvoke`
    - env `INVITATION_TABLE`, `INVITATION_MEDIA_BUCKET`, `VIDEO_RENDER_FUNCTION`

**Interfaces:**
- Consumes: the render event shape (Task 2) and the `VIDEO_RENDER_FUNCTION` env.
- Produces: both operations return `VideoState = { status: "none" | "making" | "ready" | "failed"; url?: string; fileName?: string; note?: string }`.
  - `url` is a presigned GET, valid for 15 min, with `ResponseContentDisposition: attachment; filename="<slug>-invitation.mp4"`. It is present only when the status is `ready`.
- `video.ts` exports:
  - `readState(inv, now): "none" | "making" | "ready" | "failed"`
  - `MAKING_TIMEOUT_MS = 5 * 60 * 1000`
  - `videoFileName(slug): string`

- [ ] **Step 1: Write the failing tests** (`video.test.ts`)
  - `"ready only for the current live version"`: `readState({ status:"published", liveVersion:3, videoStatus:"ready", videoLiveVersion:3 })` gives `"ready"`.
  - `"stale video after Update live"`: the same with `liveVersion:4` gives `"none"`.
  - `"making older than 5 min reads as failed"`: `videoStartedAt` 5 min + 1 s ago gives `"failed"`; 4 min ago gives `"making"`.
  - `"not live → none"`: `status:"offline"` with a ready video gives `"none"`.
  - `videoFileName("rahul-priya")` gives `"rahul-priya-invitation.mp4"`; `videoFileName(undefined)` gives `"invitation.mp4"`.

- [ ] **Step 2: Write the failing handler tests** (`handler.test.ts`), with fake db, s3 presigner and lambda client injected as in `invitation-lifecycle/handler.test.ts`:
  - `"non-staff refused"`: identity without `admin` → throws `Forbidden`.
  - `"start on a live invitation claims and invokes once"`:
    - an `UpdateItem` with condition `#s = :published AND liveVersion = :lv AND (attribute_not_exists(videoStatus) OR videoStatus <> :making OR videoStartedAt < :cutoff)`, setting `videoStatus=making, videoJob=<uuid>, videoLiveVersion=:lv, videoStartedAt=now`
    - then one `InvokeCommand` with `InvocationType: "Event"` and the render event payload
    - returns `{ status: "making" }`
  - `"second start while making returns making, no invoke"`: the condition fails and a re-read shows making → `{ status: "making" }`, zero invokes.
  - `"start when ready for this version returns the link, no new job"`.
  - `"start on a draft/offline invitation refused"` → `LifecycleError`-style `"WrongStatus"` with the message `"Only a live invitation can have a video."`.
  - `"status ready returns presigned url with attachment filename"`.

- [ ] **Step 3: Run** `npx vitest run amplify/functions/invitation-video`. Expected: FAIL.

- [ ] **Step 4: Implement `video.ts` and `handler.ts`** to pass the tests. Copy the error and identity handling from `invitation-lifecycle/handler.ts`.

- [ ] **Step 5: Remove `VIDEO_KEEP_ORPHAN`** from Task 2's proof code.

- [ ] **Step 6: Run** `npx vitest run amplify` and `npx tsc -p amplify --noEmit`. Expected: PASS.

- [ ] **Step 7: Commit** `feat(video): start and status API with one job per live version`.

### Task 4: Admin button

**Files:**
- Create:
  - `src/AdminModule/invitations/videoActions.js`: `"use server"`; `makeVideoAction({ id })` and `videoStatusAction({ id })`. Each calls `requireStaff()`, then the data call, and maps failures to `{ ok:false, message }` the way `lifecycleActions.js` does.
  - `src/AdminModule/editor/VideoButton.jsx`
  - `src/AdminModule/editor/VideoButton.test.jsx`
- Modify:
  - `src/AdminModule/invitations/data.js`: add `makeVideoRecord({ id })` (mutate `makeInvitationVideo`) and `videoStatusRecord({ id })` (query `invitationVideoStatus`), following the existing `mutate` helper. Add a `query` helper only if none exists.
  - `src/AdminModule/editor/EditorShell.jsx:362`: render `<VideoButton id=… />` just before `InvitationMenu`, only when `lifecycle.status === "published"`.

**Interfaces:**
- Consumes: `VideoState` (Task 3).
- Produces: `VideoButton({ id, make = makeVideoAction, check = videoStatusAction, pollMs = 5000 })`. The action props exist for tests.

**Behaviour, with the copy fixed by spec §5:**
- **On mount:** call `check`. If the status is `making`, show a disabled **Making video…** button with the hint `"Takes 1–2 minutes. You can keep working."`, and poll `check` every `pollMs` until the status is not `making`.
- **`none`:** a **Download video** button. Pressing it calls `make`, then behaves as for `making`.
- **`ready`:** a **Download MP4** button (an `<a href={url}>`, so the browser downloads it). Show `note` under it when present.
- **`failed`:** the text `"Couldn't make the video. Try again."` and a **Try again** button that calls `make`.
- **Action error** (`ok:false`): show its `message` and a **Try again** button.
- Use the same Tailwind button classes as the `⋯` menu trigger: `min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100`.

- [ ] **Step 1: Write the failing tests** (`VideoButton.test.jsx`, fake timers):
  - `"none → press → making → polls → ready shows Download MP4 link"`: the link's `href` equals the url from the last `check`.
  - `"failed shows the message and Try again calls make"`.
  - `"ready with note shows the note"`.
  - `"stops polling on unmount"`: no `check` calls after unmount.

- [ ] **Step 2: Run** `npx vitest run src/AdminModule/editor/VideoButton.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement** `videoActions.js`, the `data.js` additions and `VideoButton.jsx`, and wire `EditorShell`.

- [ ] **Step 4: Add an EditorShell test:** `"shows the video button only when live"`, in the existing `EditorShell.test.jsx` style: published shows **Download video**; draft does not.

- [ ] **Step 5: Run the full suite** `npx vitest run`. Expected: all pass, and the baseline snapshot file is unchanged (`git diff --stat src/InvitationModule/templates/__snapshots__` is empty).

- [ ] **Step 6: Commit** `feat(video): Download video button in the editor`.

### Task 5: Staff guide and end-to-end check

**Files:**
- Modify: `docs/admin-guide.md`. Add a "Download a video" section saying:
  - when the button appears (live invitations only)
  - the 1–2 minute wait
  - that a new video is made after "Update live invitation"
  - that music loops and fades out
  - how to share the file from a phone to WhatsApp status and an Instagram story or Reel

- [ ] **Step 1: Write the guide section** in the guide's existing tone and heading style.

- [ ] **Step 2: Commit** `docs(video): staff guide for Download video`.

- [ ] **Step 3: Get approval to push** the branch.

- [ ] **Step 4: Run the manual checklist** on the preview site, against spec §9:
  - all 5 templates
  - one Hindi invitation
  - one with no music
  - one long invitation (≥ 10 events, full gallery): ≤ 60 s
  - "Update live" during a job → the old video is not offered
  - two browsers pressing at once → one job

  Watch the results on Android and iPhone in WhatsApp status and an Instagram story. Report the results to the owner with the CloudWatch cost per video.
