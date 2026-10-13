# Digital Invitations — Phase 2b (Photos, Music & Music Library) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff add a cover photo, couple photos, a gallery of up to 12 photos and background music to an invitation, and manage a shared Music Library, with files stored in S3 and readable by guests by exact link.

**Architecture:**
- **Storage:** one Amplify Storage bucket with two folders, `invitations/<id>/` and `music-library/`. Only the `admin` group may write. A bucket policy grants public `s3:GetObject` on those two prefixes only.
- **Uploads:** browsers upload directly with Amplify Storage `uploadData`. Photos are converted (HEIC), resized and compressed in the browser first.
- **What's stored:** invitations keep file **keys** only. `mediaUrl()` turns them into URLs using a base URL that `next.config.js` derives from `amplify_outputs.json`.
- **Server checks:** before writing, the save action rejects keys outside the invitation's own folder (or the library) and resolves library tracks.
- **Music:** a new `MusicTrack` model backs `/admin/music`. A derived `Invitation.musicTrackId` column powers "used by".
- **Cleanup:** the editor deletes files it stopped referencing, but only after a save succeeds.

**Tech Stack:** Next.js 14.2 (JavaScript), Amplify Gen 2 (Storage/S3, Data/DynamoDB, AppSync JS resolver), `aws-amplify` 6 (`aws-amplify/storage`), `heic2any` (MIT, loaded on demand), aws-cdk-lib (bucket policy), zod 3, Vitest 2 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-12-invitations-phase-2b-media-design.md` (binding). It extends `docs/superpowers/specs/2026-10-08-invitations-phase-2a-editor-design.md` and `docs/superpowers/specs/2026-10-06-digital-invitations-design.md`.

## Global Constraints

- **Branch and git:**
  - Work on branch `feature/invitations-phase-2b`.
  - Never commit to `main`. Don't push or merge without the owner's approval.
  - End every commit message with a blank line, then `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Languages and code layout:**
  - `src/` is JavaScript only, and `amplify/` is TypeScript (AppSync JS resolvers are `.js` in `amplify/data/`).
  - Nothing in `src/` imports from `amplify/`.
  - Import alias `@/*` → `src/*`.
  - `zod` stays 3.x.
- **Folders and keys:**
  - The folders are exactly `invitations/<invitationId>/` and `music-library/`.
  - Uploaded file names are random (`<uuid>.jpg` / `<uuid>.mp3`).
  - Public read is `s3:GetObject` on those two prefixes only. Listing is never public. Block Public Access stays on for ACLs.
  - Invitations store keys, never URLs. `https://` keys exist only in sample data.
- **Files accepted:**
  - **Photos:** JPG/JPEG, PNG, WebP, HEIC/HEIF. Originals up to **25 MB**. HEIC is converted to JPEG in the browser. Every photo is resized to a longest side of at most **2000 px** and saved as JPEG at quality **0.82**.
  - **Music:** MP3 (`audio/mpeg`) only, up to **10 MB**.
- **Limits:**
  - The gallery holds at most **12** photos.
  - Films stay YouTube-only (no video upload).
- **Save-time checks:**
  - Every media key must be inside `invitations/<thisId>/`, except library music, which must be inside `music-library/`.
  - Keys containing `..`, `//`, a leading `/` or characters outside `[A-Za-z0-9._/-]` are rejected.
  - A library track must exist. Its real key replaces the stored copy.
- **Deleting files:** only after a save that no longer references them succeeds, and only keys inside this invitation's folder. Library files are deleted only from the Music Library page.
- **Access control:**
  - Every staff page, layout and server action calls `requireStaff()`.
  - `MusicTrack` is `admin`-group only.
- **Messages:** user-facing text is plain language for non-technical staff. Raw AWS errors are logged and never shown.
- **Dependencies:** after any dependency change, run `npm install --package-lock-only` and verify `npm ci` on a clean copy before committing. Amplify's `npm ci` rejects lockfiles that local `npm install` tolerates.
- **Tests:** unit tests never import `amplify_outputs.json` or call AWS.
- **Environment:** `amplify_outputs.json` (git-ignored) is the real sandbox output. Never commit it.
- **Staff guide:** every staff-facing change updates `docs/admin-guide.md` in the same task.
- **UI:** touch targets ≥ 44px (`min-h-[44px]`).

## Review Focus

1. **Two gallery uploads finishing at nearly the same moment.** Both photos must be kept, neither overwriting the other. Pinned in Task 5 (`GalleryEditor` keeps both concurrent uploads) via the functional `update`.
2. **A save carrying a file key from another invitation's folder, or a key like `invitations/<id>/../x`.** It must be rejected with a plain message, and nothing is written. Pinned in Task 1 (`foreignMediaKeys` / `isSafeKey` tests) and Task 3 (`prepareSave` tests).
3. **A library song deleted while an open editor still has it selected.** The next save must be rejected with "That song is no longer in the Music Library — choose another." Pinned in Task 3 (`prepareSave` missing-track test).
4. **Removing a photo and then the save failing.** The file must **not** be deleted from S3; it's deleted only after a successful save. Pinned in Task 1 (`removedMediaKeys`) and Task 5 (`EditorShell` deletes only after a successful save).
5. **HEIC, unsupported, oversized or empty files, and leaving mid-upload.**
   - A clear message is shown and nothing is uploaded.
   - An upload in progress makes leaving prompt (links) or warn (closing the tab).

   Pinned in Task 4 (`validatePhoto` / `validateMusic` / `preparePhoto`) and Task 5 (leave-guard test).

---

## File Structure

```
amplify/storage/resource.ts                 defineStorage: invitations/* and music-library/* (admin read/write/delete)
amplify/backend.ts                          (modify) add storage; public GetObject policy; Block Public Access override
amplify/data/resource.ts                    (modify) MusicTrack model; Invitation.musicTrackId; saveInvitation arg
amplify/data/saveInvitation.js (+ .test.ts) (modify) write musicTrackId
next.config.js                              (modify) media base URL + image host from amplify_outputs.json

src/InvitationModule/
  schema/invitation.js         (modify) GALLERY_MAX = 12; gallery .max(12)
  schema/draft.js (+ test)     (modify) drop gallery items beyond 12 with an error
  lib/mediaKeys.js (+ test)    prefixes, invitationFolder, isSafeKey, mediaKeys, foreignMediaKeys, removedMediaKeys
  lib/indexFields.js (+ test)  (modify) musicTrackId

src/AdminModule/
  invitations/content.js (+ test)  (modify) prepareSave: key checks + library track
  invitations/actions.js           (modify) look up library track before saving
  invitations/data.js              (modify) list musicTrackId
  music/library.js (+ test)        usageByTrack, trackNameFromFile, formatDuration, validateTrackName
  music/data.js                    MusicTrack CRUD (server)
  music/actions.js                 "use server": create / rename / delete track
  music/MusicLibrary.jsx (+ test)  the /admin/music page UI
  media/files.js (+ test)          type/size checks, isHeic, newKey, fitWithin
  media/photos.js (+ test)         preparePhoto (HEIC → JPEG, resize, compress)
  media/audio.js                   readDuration
  media/storage.js (+ test)        uploadMedia / deleteMedia (aws-amplify/storage)
  media/useUploads.js (+ test)     upload queue with progress, retry, busy flag
  editor/media/PhotoSlot.jsx       single photo (cover, bride, groom)
  editor/media/GalleryEditor.jsx   up to 12 photos with captions, reorder, remove
  editor/media/MusicPicker.jsx     none / library / one-off upload, with preview
  editor/media/media.test.jsx      tests for the three components
  editor/steps/MediaStep.jsx       (modify) cover, couple photos, gallery, film, music
  editor/EditorShell.jsx (+ test)  (modify) functional update, uploads, leave guard, delete-after-save
  editor/useAutosave.js (+ test)   (modify) onSaved(savedContent)
  editor/test-utils.jsx            (modify) functional update; invitationId/musicTracks/uploads props
  AdminShell.jsx (+ test)          (modify) Music nav item

src/app/(admin)/admin/(staff)/
  invitations/[id]/edit/page.js    (modify) pass musicTracks
  music/page.js                    Music Library page
docs/admin-guide.md                (modify) Editor step 5, Music Library, table row
```

---
### Task 1: Media key rules, gallery limit and musicTrackId

**Files:**
- Create: `src/InvitationModule/lib/mediaKeys.js`, `src/InvitationModule/lib/mediaKeys.test.js`
- Modify: `src/InvitationModule/schema/invitation.js`, `src/InvitationModule/schema/draft.js`, `src/InvitationModule/schema/draft.test.js`, `src/InvitationModule/lib/indexFields.js`, `src/InvitationModule/lib/indexFields.test.js`

**Interfaces:**
- Consumes: `invitationSchema`, `cleanDraft` (existing).
- Produces:
  - `GALLERY_MAX = 12` (exported from schema/invitation.js). The strict schema caps `media.gallery` at 12, and `cleanDraft` drops extra items with `errors["media.gallery"] = "The gallery holds up to 12 photos"`.
  - `mediaKeys.js`:
    - `INVITATION_PREFIX = "invitations/"`, `LIBRARY_PREFIX = "music-library/"`
    - `invitationFolder(id) → "invitations/<id>/"`
    - `isSafeKey(key) → boolean`
    - `mediaKeys(draft) → { field, key }[]`
    - `foreignMediaKeys(draft, invitationId) → string[]`
    - `removedMediaKeys(before, after, invitationId) → string[]`
  - `indexFields(draft)` now also returns `musicTrackId: string | null`.

- [ ] **Step 1: Write the failing tests**

`src/InvitationModule/lib/mediaKeys.test.js`:

```js
import { describe, expect, it } from "vitest";
import { foreignMediaKeys, invitationFolder, isSafeKey, mediaKeys, removedMediaKeys } from "./mediaKeys";

const ID = "inv-1";
const own = (name) => `${invitationFolder(ID)}${name}`;

describe("isSafeKey", () => {
  it("accepts plain keys", () => {
    expect(isSafeKey("invitations/inv-1/3f9a.jpg")).toBe(true);
    expect(isSafeKey("music-library/ab_12.mp3")).toBe(true);
  });

  it("rejects keys a browser could resolve to a different file", () => {
    for (const bad of ["invitations/inv-1/../inv-2/a.jpg", "invitations//a.jpg", "/invitations/inv-1/a.jpg", "invitations/inv-1/a b.jpg", "https://x.com/a.jpg", "", null]) {
      expect(isSafeKey(bad)).toBe(false);
    }
  });
});

describe("mediaKeys", () => {
  it("lists every file the invitation uses", () => {
    const draft = {
      couple: { bride: { photoKey: own("b.jpg") }, groom: {} },
      media: { coverKey: own("c.jpg"), gallery: [{ key: own("g1.jpg") }, { caption: { en: "x" } }], music: { type: "upload", key: own("m.mp3") } },
    };
    expect(mediaKeys(draft)).toEqual([
      { field: "media.coverKey", key: own("c.jpg") },
      { field: "couple.bride.photoKey", key: own("b.jpg") },
      { field: "media.gallery.0.key", key: own("g1.jpg") },
      { field: "media.music.key", key: own("m.mp3") },
    ]);
    expect(mediaKeys({})).toEqual([]);
  });
});

describe("foreignMediaKeys", () => {
  it("accepts this invitation's files and library music", () => {
    const draft = { media: { coverKey: own("c.jpg"), music: { type: "library", trackId: "t1", key: "music-library/t.mp3" } } };
    expect(foreignMediaKeys(draft, ID)).toEqual([]);
  });

  it("flags files from another invitation, unsafe keys and full URLs", () => {
    const draft = {
      media: {
        coverKey: "invitations/inv-2/c.jpg",
        gallery: [{ key: own("../inv-2/g.jpg") }, { key: "https://example.com/g.jpg" }],
        music: { type: "upload", key: "music-library/t.mp3" },
      },
    };
    expect(foreignMediaKeys(draft, ID)).toEqual([
      "invitations/inv-2/c.jpg",
      own("../inv-2/g.jpg"),
      "https://example.com/g.jpg",
      "music-library/t.mp3",
    ]);
  });

  it("flags library music that isn't in the library folder", () => {
    expect(foreignMediaKeys({ media: { music: { type: "library", trackId: "t1", key: own("m.mp3") } } }, ID)).toEqual([own("m.mp3")]);
  });
});

describe("removedMediaKeys", () => {
  it("returns this invitation's files that the new version no longer uses", () => {
    const before = { media: { coverKey: own("old.jpg"), gallery: [{ key: own("g1.jpg") }, { key: own("g2.jpg") }] } };
    const after = { media: { coverKey: own("new.jpg"), gallery: [{ key: own("g2.jpg") }] } };
    expect(removedMediaKeys(before, after, ID).sort()).toEqual([own("g1.jpg"), own("old.jpg")]);
  });

  it("never returns library files or files that moved within the invitation", () => {
    const before = { media: { coverKey: own("a.jpg"), music: { type: "library", trackId: "t1", key: "music-library/t.mp3" } } };
    const after = { media: { gallery: [{ key: own("a.jpg") }] } };
    expect(removedMediaKeys(before, after, ID)).toEqual([]);
  });
});
```

Append to `src/InvitationModule/schema/draft.test.js`:

```js
describe("cleanDraft gallery limit", () => {
  it("keeps the first 12 gallery photos and explains why the rest were dropped", () => {
    const gallery = Array.from({ length: 14 }, (_, i) => ({ key: `invitations/i/${i}.jpg` }));
    const { draft, errors } = cleanDraft({ templateId: "royal", theme: { palette: "maroon-gold" }, media: { gallery } });
    expect(draft.media.gallery).toHaveLength(12);
    expect(draft.media.gallery[11].key).toBe("invitations/i/11.jpg");
    expect(errors["media.gallery"]).toBe("The gallery holds up to 12 photos");
  });
});
```

Append to `src/InvitationModule/lib/indexFields.test.js`:

```js
describe("indexFields musicTrackId", () => {
  it("records the library track an invitation uses", () => {
    expect(indexFields({ templateId: "royal", media: { music: { type: "library", trackId: "t1", key: "music-library/t.mp3" } } }).musicTrackId).toBe("t1");
  });

  it("is null for one-off uploads or no music", () => {
    expect(indexFields({ templateId: "royal", media: { music: { type: "upload", key: "invitations/i/m.mp3" } } }).musicTrackId).toBeNull();
    expect(indexFields({ templateId: "royal" }).musicTrackId).toBeNull();
  });
});
```

In the existing `indexFields` tests that compare the whole result with `toEqual`, add `musicTrackId: null` to the expected objects.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/InvitationModule`
Expected: FAIL. `./mediaKeys` can't be resolved, the gallery isn't limited, and `musicTrackId` is missing.

- [ ] **Step 3: Implement the key rules**

`src/InvitationModule/lib/mediaKeys.js`:

```js
export const INVITATION_PREFIX = "invitations/";
export const LIBRARY_PREFIX = "music-library/";

export const invitationFolder = (id) => `${INVITATION_PREFIX}${id}/`;

// Plain S3 keys only. Anything a browser could normalise into a different path ("..", "//") is refused.
const SAFE_KEY = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

export function isSafeKey(key) {
  return typeof key === "string" && SAFE_KEY.test(key) && !key.split("/").includes("..");
}

/** Every file an invitation draft points at, with where it is used. */
export function mediaKeys(draft) {
  const found = [];
  const add = (field, key) => {
    if (typeof key === "string" && key) found.push({ field, key });
  };
  add("media.coverKey", draft?.media?.coverKey);
  add("couple.bride.photoKey", draft?.couple?.bride?.photoKey);
  add("couple.groom.photoKey", draft?.couple?.groom?.photoKey);
  (draft?.media?.gallery ?? []).forEach((item, i) => add(`media.gallery.${i}.key`, item?.key));
  add("media.music.key", draft?.media?.music?.key);
  return found;
}

/** Keys that don't belong to this invitation (or, for library music, to the library). */
export function foreignMediaKeys(draft, invitationId) {
  const folder = invitationFolder(invitationId);
  const libraryMusic = draft?.media?.music?.type === "library";
  return mediaKeys(draft)
    .filter(({ field, key }) => {
      if (!isSafeKey(key)) return true;
      const allowed = field === "media.music.key" && libraryMusic ? LIBRARY_PREFIX : folder;
      return !key.startsWith(allowed);
    })
    .map(({ key }) => key);
}

/** This invitation's own files that `before` used and `after` no longer does — safe to delete once `after` is saved. */
export function removedMediaKeys(before, after, invitationId) {
  const folder = invitationFolder(invitationId);
  const kept = new Set(mediaKeys(after).map(({ key }) => key));
  const previous = new Set(mediaKeys(before).map(({ key }) => key));
  return [...previous].filter((key) => key.startsWith(folder) && isSafeKey(key) && !kept.has(key));
}
```

- [ ] **Step 4: Cap the gallery**

`src/InvitationModule/schema/invitation.js`:
- Add `export const GALLERY_MAX = 12;` next to the other exported constants.
- Change the gallery line inside `media` to:

```js
      gallery: z
        .array(z.object({ key: z.string().min(1), caption: localised.optional() }))
        .max(GALLERY_MAX, `The gallery holds up to ${GALLERY_MAX} photos`)
        .default([]),
```

`src/InvitationModule/schema/draft.js`:
- Import `GALLERY_MAX` alongside `TEMPLATE_IDS`.
- In `cleanDraft`'s success branch, before the `return`, trim the gallery. The draft schema rebuilds arrays without the strict `.max`.

```js
    if (result.success) {
      const draft = result.data;
      if ((draft.media?.gallery?.length ?? 0) > GALLERY_MAX) {
        errors["media.gallery"] = `The gallery holds up to ${GALLERY_MAX} photos`;
        draft.media.gallery = draft.media.gallery.slice(0, GALLERY_MAX);
      }
      const valid = TEMPLATE_IDS.includes(draft.templateId) && Boolean(draft.theme?.palette);
      return { draft: valid ? draft : null, errors };
    }
```

- [ ] **Step 5: Add musicTrackId to the index fields**

`src/InvitationModule/lib/indexFields.js`: add to the returned object:

```js
    musicTrackId: draft.media?.music?.type === "library" ? draft.media.music.trackId ?? null : null,
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/InvitationModule`
Expected: PASS, including every existing template test. The template samples have 6 gallery photos.

- [ ] **Step 7: Run all tests and commit**

```bash
npm test
git add src/InvitationModule
git commit -m "feat(invitations): add media key rules, a 12-photo gallery limit and musicTrackId"
```

Expected: all tests pass. If `src/AdminModule/invitations/content.test.js` compares `fields` with `toEqual`, add `musicTrackId: null` to its expected object in this commit.

---

### Task 2: Storage bucket, MusicTrack model and media URLs (backend)

**Files:**
- Create: `amplify/storage/resource.ts`
- Modify: `amplify/backend.ts`, `amplify/data/resource.ts`, `amplify/data/saveInvitation.js`, `amplify/data/saveInvitation.test.ts`, `next.config.js`

**Interfaces:**
- Consumes: the existing backend (auth with `admin`/`owner` groups, data, staffAdmin) and the sandbox deploy flow.
- Produces:
  - **Storage:** bucket with `invitations/*` and `music-library/*`, where the `admin` group has `read`/`write`/`delete`. A bucket policy allows public `s3:GetObject` on `invitations/*` and `music-library/*` only. `amplify_outputs.json` gains `storage.bucket_name` and `storage.aws_region`.
  - **Data:**
    - `MusicTrack { id, name, key, durationSec?, createdBy, createdAt, updatedAt }`, `admin` group: all operations.
    - `Invitation.musicTrackId` (string, optional).
    - `saveInvitation` accepts `musicTrackId` (optional) and writes it (null when absent).
  - **Next:** `process.env.NEXT_PUBLIC_MEDIA_BASE_URL` = `https://<bucket>.s3.<region>.amazonaws.com` (empty if outputs are missing), and that host is allowed in `images.remotePatterns`.

- [ ] **Step 1: Update the resolver test (failing)**

In `amplify/data/saveInvitation.test.ts`:
- Add `musicTrackId: null,` to the expected `update` object in the first test, right after `searchText: "priya rahul",`.
- Add a test:

```ts
  it("stores the library track id when given", () => {
    const req = request({ args: { ...args, musicTrackId: "t1" } } as any) as any;
    expect(req.input.update.musicTrackId).toBe("t1");
  });
```

Run: `npx vitest run amplify/data/saveInvitation.test.ts`
Expected: FAIL (`musicTrackId` missing from the update).

- [ ] **Step 2: Write musicTrackId in the resolver**

`amplify/data/saveInvitation.js`:
- Add `musicTrackId` to the destructured `ctx.args`.
- Add `musicTrackId: musicTrackId ?? null,` to the `update` object, right after `searchText`.

Run: `npx vitest run amplify/data/saveInvitation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3: Define the storage**

`amplify/storage/resource.ts`:

```ts
import { defineStorage } from "@aws-amplify/backend";

// Staff upload and remove files. Guests read single files by exact URL through the bucket policy in backend.ts.
export const storage = defineStorage({
  name: "invitationMedia",
  access: (allow) => ({
    "invitations/*": [allow.groups(["admin"]).to(["read", "write", "delete"])],
    "music-library/*": [allow.groups(["admin"]).to(["read", "write", "delete"])],
  }),
});
```

- [ ] **Step 4: Add the models**

`amplify/data/resource.ts`, inside `a.schema({ ... })`:
- In the `Invitation` model fields, add `musicTrackId: a.string(),` after `searchText`.
- In `saveInvitation`'s `.arguments({...})`, add `musicTrackId: a.string(),` after `searchText`.
- Add a new model after `saveInvitation`:

```ts
  MusicTrack: a
    .model({
      name: a.string().required(),
      key: a.string().required(),
      durationSec: a.integer(),
      createdBy: a.string().required(),
    })
    .authorization((allow) => [allow.group("admin")]),
```

- [ ] **Step 5: Wire storage and public read**

`amplify/backend.ts`:
- Add the imports and the storage resource:

```ts
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { storage } from "./storage/resource";
```

- Change `defineBackend({ auth, data, staffAdmin })` to `defineBackend({ auth, data, staffAdmin, storage })`.
- Append:

```ts
// Guests' phones load invitation photos and music by exact URL. Only GetObject on these two folders is public:
// nothing can be listed, and the rest of the bucket stays private.
const { bucket, cfnResources } = backend.storage.resources;
cfnResources.cfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
};
bucket.addToResourcePolicy(
  new PolicyStatement({
    sid: "PublicReadInvitationMedia",
    effect: Effect.ALLOW,
    principals: [new AnyPrincipal()],
    actions: ["s3:GetObject"],
    resources: [bucket.arnForObjects("invitations/*"), bucket.arnForObjects("music-library/*")],
  }),
);
```

- [ ] **Step 6: Derive the media URL in next.config.js**

`next.config.js`: replace the file with:

```js
const fs = require("fs");
const path = require("path");

// Each environment (sandbox, preview branch, production) has its own bucket; its name comes from amplify_outputs.json.
function mediaHost() {
  try {
    const outputs = JSON.parse(fs.readFileSync(path.join(__dirname, "amplify_outputs.json"), "utf8"));
    const bucket = outputs.storage?.bucket_name;
    const region = outputs.storage?.aws_region;
    return bucket && region ? `${bucket}.s3.${region}.amazonaws.com` : null;
  } catch {
    return null;
  }
}

const MEDIA_HOST = mediaHost();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL || (MEDIA_HOST ? `https://${MEDIA_HOST}` : ""),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(MEDIA_HOST ? [{ protocol: "https", hostname: MEDIA_HOST }] : []),
    ],
  },
  webpack(config) {
    // The staff guide in docs/ is bundled into /admin/help as a string.
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

module.exports = nextConfig;
```

- [ ] **Step 7: Type-check, deploy the sandbox and check the bucket**

```bash
npx tsc --noEmit -p amplify/tsconfig.json
npx ampx sandbox --once
node -e "const o=require('./amplify_outputs.json');console.log(o.storage.bucket_name,o.storage.aws_region,Object.keys(o.data.model_introspection.models))"
```

Expected:
- `tsc` passes.
- The deploy ends with `Deployment completed`.
- The last line prints the bucket name, `us-east-1` and `[ 'Invitation', 'MusicTrack' ]`.

Then prove public read-by-link works and listing doesn't (`B` is the bucket name printed above):

```bash
B=$(node -e "console.log(require('./amplify_outputs.json').storage.bucket_name)")
printf 'probe' > probe.txt
aws s3 cp probe.txt "s3://$B/invitations/probe-check/probe.txt" --content-type text/plain
curl -s -o /dev/null -w "public get: %{http_code}\n" "https://$B.s3.us-east-1.amazonaws.com/invitations/probe-check/probe.txt"
curl -s -o /dev/null -w "public list: %{http_code}\n" "https://$B.s3.us-east-1.amazonaws.com/?list-type=2&prefix=invitations/"
curl -s -o /dev/null -w "outside folders: %{http_code}\n" "https://$B.s3.us-east-1.amazonaws.com/other/probe.txt"
aws s3 rm "s3://$B/invitations/probe-check/probe.txt"; rm probe.txt
```

Expected: `public get: 200`, `public list: 403`, `outside folders: 403`.
- If `aws s3 cp` is denied for the local IAM user, skip the upload and record that in the report. Task 7 repeats the check through the app.
- If synth rejects the `publicAccessBlockConfiguration` assignment or `addToResourcePolicy`, check the installed types (`node_modules/aws-cdk-lib/aws-s3/lib/s3.generated.d.ts` → `CfnBucket.publicAccessBlockConfiguration`, and `IBucket.addToResourcePolicy`). Make the minimal fix with the same permissions, and record it.

- [ ] **Step 8: Build, run all tests and commit**

```bash
npm test
npx next build
node -e "const c=require('./next.config.js');console.log(c.env.NEXT_PUBLIC_MEDIA_BASE_URL, JSON.stringify(c.images.remotePatterns))"
git add amplify next.config.js
git commit -m "feat(backend): add media storage with public read-by-link, MusicTrack model and musicTrackId"
```

Expected: tests pass, the build succeeds, and the `node -e` line prints the bucket URL and both image hosts. Never stage `amplify_outputs.json`.

---

### Task 3: Save-time media checks and Music Library server layer

**Files:**
- Modify: `src/AdminModule/invitations/content.js`, `src/AdminModule/invitations/content.test.js`, `src/AdminModule/invitations/actions.js`, `src/AdminModule/invitations/data.js`
- Create: `src/AdminModule/music/library.js`, `src/AdminModule/music/library.test.js`, `src/AdminModule/music/data.js`, `src/AdminModule/music/actions.js`

**Interfaces:**
- Consumes:
  - `foreignMediaKeys`, `isSafeKey`, `LIBRARY_PREFIX` (Task 1); `indexFields` with `musicTrackId` (Task 1)
  - `MusicTrack` model and the `saveInvitation(… musicTrackId)` argument (Task 2)
  - `cookieDataClient`, `requireStaff`
- Produces:
  - `content.js`:
    - `prepareSave({ id, expectedVersion, content, libraryTrack })`. `libraryTrack` is `{ id, key } | null`.
    - New messages: `FOREIGN_FILE`, `MISSING_TRACK`.
  - `listInvitations()` rows now include `musicTrackId`.
  - `music/library.js`:
    - `usageByTrack(rows) → Record<trackId, string[]>` (couple names)
    - `trackNameFromFile(fileName) → string`
    - `formatDuration(seconds) → "m:ss" | ""`
    - `validateTrackName(name) → string | null`
    - `usedByMessage(count) → string`
    - `isLibraryKey(key) → boolean`
  - `music/data.js` (server):
    - `listMusicTracks() → track[]` (sorted by name)
    - `getMusicTrack(id) → track | null`
    - `createMusicTrackRecord({ name, key, durationSec, email }) → track`
    - `renameMusicTrackRecord(id, name)`
    - `deleteMusicTrackRecord(id)`
    - A track is `{ id, name, key, durationSec, createdBy, createdAt }`.
  - `music/actions.js` (server actions):
    - `createMusicTrackAction({ name, key, durationSec }) → { ok, track? , message? }`
    - `renameMusicTrackAction({ id, name }) → { ok, message? }`
    - `deleteMusicTrackAction({ id }) → { ok, key?, message? }`. On success it returns the file key so the browser can delete the file.

- [ ] **Step 1: Write the failing tests**

Append to `src/AdminModule/invitations/content.test.js` (extend the import to include `FOREIGN_FILE` and `MISSING_TRACK`):

```js
describe("prepareSave media checks", () => {
  const base = { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" };

  it("accepts this invitation's own files", () => {
    const content = { ...base, media: { coverKey: "invitations/inv-1/c.jpg", gallery: [{ key: "invitations/inv-1/g.jpg" }] } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null }).ok).toBe(true);
  });

  it("rejects a file from another invitation's folder", () => {
    const content = { ...base, media: { coverKey: "invitations/inv-2/c.jpg" } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null })).toEqual({ ok: false, message: FOREIGN_FILE });
  });

  it("rejects a key that tries to step out of the folder", () => {
    const content = { ...base, media: { gallery: [{ key: "invitations/inv-1/../inv-2/g.jpg" }] } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null }).message).toBe(FOREIGN_FILE);
  });

  it("uses the library track's real file and records its id", () => {
    const content = { ...base, media: { music: { type: "library", trackId: "t1", key: "music-library/stale.mp3" } } };
    const result = prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: { id: "t1", key: "music-library/real.mp3" } });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.content).media.music).toEqual({ type: "library", trackId: "t1", key: "music-library/real.mp3" });
    expect(result.fields.musicTrackId).toBe("t1");
  });

  it("refuses a library song that no longer exists", () => {
    const content = { ...base, media: { music: { type: "library", trackId: "gone", key: "music-library/x.mp3" } } };
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content, libraryTrack: null })).toEqual({ ok: false, message: MISSING_TRACK });
  });
});
```

`src/AdminModule/music/library.test.js`:

```js
import { describe, expect, it } from "vitest";
import { formatDuration, isLibraryKey, trackNameFromFile, usageByTrack, usedByMessage, validateTrackName } from "./library";

describe("usageByTrack", () => {
  it("groups invitations by the library track they use", () => {
    const rows = [
      { coupleNames: "Priya & Rahul", musicTrackId: "t1" },
      { coupleNames: "Neha & Arjun", musicTrackId: "t1" },
      { coupleNames: "Aarohi & Vihaan", musicTrackId: null },
      { coupleNames: "Isha & Kabir", musicTrackId: "t2" },
    ];
    expect(usageByTrack(rows)).toEqual({ t1: ["Priya & Rahul", "Neha & Arjun"], t2: ["Isha & Kabir"] });
  });
});

describe("trackNameFromFile", () => {
  it("turns a file name into a readable default name", () => {
    expect(trackNameFromFile("Shehnai_Wedding-Entry.mp3")).toBe("Shehnai Wedding Entry");
    expect(trackNameFromFile("")).toBe("");
  });
});

describe("formatDuration", () => {
  it("shows minutes and seconds", () => {
    expect(formatDuration(195.4)).toBe("3:15");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(undefined)).toBe("");
  });
});

describe("validateTrackName", () => {
  it("requires a name under 80 characters", () => {
    expect(validateTrackName("  Shehnai ")).toBeNull();
    expect(validateTrackName("   ")).toBe("Enter a name for the song.");
    expect(validateTrackName("x".repeat(81))).toBe("Keep the name under 80 characters.");
  });
});

describe("usedByMessage", () => {
  it("explains why a track can't be deleted", () => {
    expect(usedByMessage(1)).toBe("Used by 1 invitation — change its music first.");
    expect(usedByMessage(3)).toBe("Used by 3 invitations — change their music first.");
  });
});

describe("isLibraryKey", () => {
  it("accepts only MP3 files in the library folder", () => {
    expect(isLibraryKey("music-library/3f9a.mp3")).toBe(true);
    expect(isLibraryKey("invitations/i/3f9a.mp3")).toBe(false);
    expect(isLibraryKey("music-library/../x.mp3")).toBe(false);
    expect(isLibraryKey("music-library/a.wav")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/invitations src/AdminModule/music`
Expected: FAIL. The new messages and `./library` don't exist, and library music isn't resolved.

- [ ] **Step 3: Extend prepareSave**

`src/AdminModule/invitations/content.js`:
- Add `import { foreignMediaKeys } from "@/InvitationModule/lib/mediaKeys";`.
- Add the messages:

```js
export const FOREIGN_FILE = "That file doesn't belong to this invitation. Remove it and upload again.";
export const MISSING_TRACK = "That song is no longer in the Music Library — choose another.";
```

- Replace `prepareSave` with:

```js
export function prepareSave({ id, expectedVersion, content, libraryTrack = null }) {
  if (typeof id !== "string" || !id || !Number.isInteger(expectedVersion)) {
    return { ok: false, message: "That save request wasn't valid. Reload the page." };
  }
  const { draft } = cleanDraft(content);
  if (!draft) return { ok: false, message: "Choose a template and palette before saving." };

  const music = draft.media?.music;
  if (music?.type === "library") {
    if (!libraryTrack || libraryTrack.id !== music.trackId) return { ok: false, message: MISSING_TRACK };
    // Always the library's own file, never a copy the browser sent.
    music.key = libraryTrack.key;
  }
  if (foreignMediaKeys(draft, id).length > 0) return { ok: false, message: FOREIGN_FILE };

  return { ok: true, content: JSON.stringify(draft), fields: indexFields(draft) };
}
```

- [ ] **Step 4: Implement the Music Library helpers**

`src/AdminModule/music/library.js`:

```js
import { isSafeKey, LIBRARY_PREFIX } from "@/InvitationModule/lib/mediaKeys";

export const MAX_TRACK_NAME = 80;

/** Couple names of the invitations using each library track. */
export function usageByTrack(rows) {
  const usage = {};
  for (const row of rows) {
    if (row.musicTrackId) (usage[row.musicTrackId] ??= []).push(row.coupleNames);
  }
  return usage;
}

export function trackNameFromFile(fileName) {
  return String(fileName ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function validateTrackName(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "Enter a name for the song.";
  if (trimmed.length > MAX_TRACK_NAME) return `Keep the name under ${MAX_TRACK_NAME} characters.`;
  return null;
}

export function usedByMessage(count) {
  return count === 1 ? "Used by 1 invitation — change its music first." : `Used by ${count} invitations — change their music first.`;
}

export function isLibraryKey(key) {
  return isSafeKey(key) && key.startsWith(LIBRARY_PREFIX) && key.endsWith(".mp3");
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/invitations src/AdminModule/music`
Expected: PASS.

- [ ] **Step 6: Implement the server data functions and actions**

`src/AdminModule/invitations/data.js`: add `"musicTrackId"` to `LIST_FIELDS`.

`src/AdminModule/invitations/actions.js`:
- Add `import { getMusicTrack } from "@/AdminModule/music/data";`.
- In `saveInvitationAction`, replace `const prepared = prepareSave({ id, expectedVersion, content });` with:

```js
  const trackId = content?.media?.music?.type === "library" ? content.media.music.trackId : null;
  let libraryTrack = null;
  if (typeof trackId === "string" && trackId) {
    try {
      libraryTrack = await getMusicTrack(trackId);
    } catch (err) {
      console.error("getMusicTrack failed", err);
      return { ok: false, message: SAVE_FAILED };
    }
  }
  const prepared = prepareSave({ id, expectedVersion, content, libraryTrack });
```

`src/AdminModule/music/data.js`:

```js
import { cookieDataClient } from "@/AdminModule/dataClient";

const TRACK_FIELDS = ["id", "name", "key", "durationSec", "createdBy", "createdAt"];

function failIfErrors(errors) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
}

export async function listMusicTracks() {
  const client = cookieDataClient();
  const tracks = [];
  let nextToken = null;
  do {
    const page = await client.models.MusicTrack.list({ selectionSet: TRACK_FIELDS, limit: 100, nextToken });
    failIfErrors(page.errors);
    tracks.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMusicTrack(id) {
  const { data, errors } = await cookieDataClient().models.MusicTrack.get({ id }, { selectionSet: TRACK_FIELDS });
  failIfErrors(errors);
  return data ?? null;
}

export async function createMusicTrackRecord({ name, key, durationSec, email }) {
  const { data, errors } = await cookieDataClient().models.MusicTrack.create({ name, key, durationSec, createdBy: email });
  failIfErrors(errors);
  if (!data) throw new Error("MusicTrack.create returned no data");
  return { id: data.id, name: data.name, key: data.key, durationSec: data.durationSec, createdBy: data.createdBy, createdAt: data.createdAt };
}

export async function renameMusicTrackRecord(id, name) {
  const { errors } = await cookieDataClient().models.MusicTrack.update({ id, name });
  failIfErrors(errors);
}

export async function deleteMusicTrackRecord(id) {
  const { errors } = await cookieDataClient().models.MusicTrack.delete({ id });
  failIfErrors(errors);
}
```

`src/AdminModule/music/actions.js`:

```js
"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { listInvitations } from "@/AdminModule/invitations/data";
import { createMusicTrackRecord, deleteMusicTrackRecord, getMusicTrack, renameMusicTrackRecord } from "./data";
import { isLibraryKey, usageByTrack, usedByMessage, validateTrackName } from "./library";

const FAILED = "Something went wrong. Please try again.";

export async function createMusicTrackAction({ name, key, durationSec }) {
  const session = await requireStaff();
  const nameError = validateTrackName(name);
  if (nameError) return { ok: false, message: nameError };
  if (!isLibraryKey(key)) return { ok: false, message: "That file isn't in the Music Library. Upload it again." };
  const seconds = Number.isInteger(durationSec) && durationSec >= 0 ? durationSec : null;
  try {
    const track = await createMusicTrackRecord({ name: name.trim(), key, durationSec: seconds, email: session.email });
    revalidatePath("/admin/music");
    return { ok: true, track };
  } catch (err) {
    console.error("createMusicTrack failed", err);
    return { ok: false, message: FAILED };
  }
}

export async function renameMusicTrackAction({ id, name }) {
  await requireStaff();
  const nameError = validateTrackName(name);
  if (nameError) return { ok: false, message: nameError };
  try {
    await renameMusicTrackRecord(id, name.trim());
    revalidatePath("/admin/music");
    return { ok: true };
  } catch (err) {
    console.error("renameMusicTrack failed", err);
    return { ok: false, message: FAILED };
  }
}

export async function deleteMusicTrackAction({ id }) {
  await requireStaff();
  try {
    // Checked again here, not just on the page: an invitation may have picked this song since the page loaded.
    const users = usageByTrack(await listInvitations())[id] ?? [];
    if (users.length > 0) return { ok: false, message: usedByMessage(users.length) };
    const track = await getMusicTrack(id);
    if (!track) {
      revalidatePath("/admin/music");
      return { ok: true, key: null };
    }
    await deleteMusicTrackRecord(id);
    revalidatePath("/admin/music");
    return { ok: true, key: track.key };
  } catch (err) {
    console.error("deleteMusicTrack failed", err);
    return { ok: false, message: FAILED };
  }
}
```

- [ ] **Step 7: Build, run all tests and commit**

```bash
npm test
npx next build
git add src/AdminModule/invitations src/AdminModule/music
git commit -m "feat(invitations): check media keys on save and add Music Library server actions"
```

Expected: tests pass and the build succeeds.

---

### Task 4: Browser media helpers — checks, HEIC conversion, compression, uploads

**Files:**
- Create: `src/AdminModule/media/files.js`, `src/AdminModule/media/files.test.js`
- Create: `src/AdminModule/media/photos.js`, `src/AdminModule/media/photos.test.js`
- Create: `src/AdminModule/media/audio.js`
- Create: `src/AdminModule/media/storage.js`, `src/AdminModule/media/storage.test.js`
- Create: `src/AdminModule/media/useUploads.js`, `src/AdminModule/media/useUploads.test.jsx`
- Modify: `package.json`, `package-lock.json` (add `heic2any`)

**Interfaces:**
- Consumes: `aws-amplify/storage` (`uploadData`, `remove`). Amplify is already configured in the browser by `ConfigureAmplify`, and after Task 2 its outputs include `storage`.
- Produces:
  - `files.js`:
    - constants `MAX_PHOTO_BYTES`, `MAX_MUSIC_BYTES`, `PHOTO_MAX_SIDE = 2000`, `PHOTO_QUALITY = 0.82`, `PHOTO_ACCEPT`, `MUSIC_ACCEPT`
    - `isHeic(file)`
    - `validatePhoto(file) → string | null`
    - `validateMusic(file) → string | null`
    - `fitWithin(w, h, maxSide?) → { width, height }`
    - `randomId()`
    - `newKey(folder, ext) → string`
  - `photos.js`:
    - `preparePhoto(file, deps?) → Promise<Blob>` (JPEG)
    - `PhotoError` (has `friendly = true`)
    - messages `HEIC_FAILED`, `PHOTO_FAILED`
  - `audio.js`: `readDuration(file) → Promise<number | null>` (seconds)
  - `storage.js`:
    - `uploadMedia({ key, blob, contentType, onProgress(fraction) }) → Promise<key>`
    - `deleteMedia(keys) → Promise<void>`. It never throws; failures are logged with `console.warn`.
  - `useUploads.js`:
    - `useUploads() → { items, start(job), retry(id), dismiss(id), busy }`
    - A job is `{ label, group?, run(onProgress) → Promise<result>, onDone(result) }`.
    - An item is `{ id, label, group, status: "uploading" | "failed", progress (0–1), error }`.
    - `UPLOAD_FAILED`.

- [ ] **Step 1: Add the HEIC converter dependency (lockfile-safe)**

```bash
npm install heic2any@0.0.4
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
D="$(mktemp -d)"; cp package.json package-lock.json "$D/"; (cd "$D" && npm ci --ignore-scripts --no-audit --no-fund 2>&1 | grep -E "EUSAGE|Invalid|Missing|added"); rm -rf "$D"
```

Expected: the clean `npm ci` prints `added … packages` with no `EUSAGE`/`Invalid`/`Missing` lines. If it fails, rerun the `--package-lock-only` line and check again before continuing.

- [ ] **Step 2: Write the failing tests**

`src/AdminModule/media/files.test.js`:

```js
import { describe, expect, it } from "vitest";
import { fitWithin, isHeic, newKey, validateMusic, validatePhoto } from "./files";

const file = (name, type, size = 1000) => ({ name, type, size });

describe("validatePhoto", () => {
  it("accepts JPG, PNG, WebP and iPhone photos", () => {
    expect(validatePhoto(file("a.jpg", "image/jpeg"))).toBeNull();
    expect(validatePhoto(file("PXL_20261012.jpg", "image/jpeg"))).toBeNull();
    expect(validatePhoto(file("a.png", "image/png"))).toBeNull();
    expect(validatePhoto(file("a.webp", "image/webp"))).toBeNull();
    expect(validatePhoto(file("IMG_1.HEIC", ""))).toBeNull();
    expect(validatePhoto(file("IMG_2.heif", "image/heif"))).toBeNull();
  });

  it("explains what's wrong with anything else", () => {
    expect(validatePhoto(file("a.gif", "image/gif"))).toBe("Use a JPG, PNG, WebP or iPhone photo.");
    expect(validatePhoto(file("a.pdf", "application/pdf"))).toBe("Use a JPG, PNG, WebP or iPhone photo.");
    expect(validatePhoto(file("big.jpg", "image/jpeg", 26 * 1024 * 1024))).toBe("That photo is over 25 MB.");
    expect(validatePhoto(file("empty.jpg", "image/jpeg", 0))).toBe("That file is empty — choose another photo.");
  });
});

describe("validateMusic", () => {
  it("accepts MP3 under 10 MB only", () => {
    expect(validateMusic(file("song.mp3", "audio/mpeg"))).toBeNull();
    expect(validateMusic(file("song.MP3", ""))).toBeNull();
    expect(validateMusic(file("song.wav", "audio/wav"))).toBe("Choose an MP3 under 10 MB.");
    expect(validateMusic(file("long.mp3", "audio/mpeg", 11 * 1024 * 1024))).toBe("Choose an MP3 under 10 MB.");
    expect(validateMusic(file("empty.mp3", "audio/mpeg", 0))).toBe("That file is empty — choose another song.");
  });
});

describe("isHeic", () => {
  it("recognises iPhone photos by type or extension", () => {
    expect(isHeic(file("x.heic", ""))).toBe(true);
    expect(isHeic(file("x.jpg", "image/heic"))).toBe(true);
    expect(isHeic(file("x.jpg", "image/jpeg"))).toBe(false);
  });
});

describe("fitWithin", () => {
  it("shrinks the longest side to 2000 px and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1000, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("newKey", () => {
  it("makes a random file name inside the folder", () => {
    const a = newKey("invitations/inv-1/", "jpg");
    const b = newKey("invitations/inv-1/", "jpg");
    expect(a).toMatch(/^invitations\/inv-1\/[A-Za-z0-9]+\.jpg$/);
    expect(a).not.toBe(b);
  });
});
```

`src/AdminModule/media/photos.test.js`:

```js
import { describe, expect, it, vi } from "vitest";
import { HEIC_FAILED, PHOTO_FAILED, PhotoError, preparePhoto } from "./photos";

const bitmap = (width, height) => ({ width, height, close: vi.fn() });

describe("preparePhoto", () => {
  it("resizes to fit 2000 px and re-encodes as JPEG at 0.82", async () => {
    const decoded = bitmap(4032, 3024);
    const decode = vi.fn(async () => decoded);
    const encode = vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" }));
    const out = await preparePhoto({ name: "a.jpg", type: "image/jpeg", size: 5 }, { decode, encode, convertHeic: vi.fn() });
    expect(encode).toHaveBeenCalledWith(decoded, { width: 2000, height: 1500 }, 0.82);
    expect(out.type).toBe("image/jpeg");
    expect(decoded.close).toHaveBeenCalled();
  });

  it("converts iPhone photos to JPEG first", async () => {
    const converted = new Blob(["converted"], { type: "image/jpeg" });
    const convertHeic = vi.fn(async () => converted);
    const decode = vi.fn(async () => bitmap(100, 100));
    await preparePhoto({ name: "IMG_1.HEIC", type: "", size: 5 }, { convertHeic, decode, encode: async () => new Blob([]) });
    expect(convertHeic).toHaveBeenCalled();
    expect(decode).toHaveBeenCalledWith(converted);
  });

  it("explains a failed iPhone conversion", async () => {
    const convertHeic = vi.fn(async () => {
      throw new Error("libheif");
    });
    await expect(preparePhoto({ name: "x.heic", type: "image/heic", size: 5 }, { convertHeic })).rejects.toMatchObject({
      message: HEIC_FAILED,
      friendly: true,
    });
  });

  it("explains a photo the browser can't read", async () => {
    const decode = vi.fn(async () => {
      throw new Error("decode");
    });
    const error = await preparePhoto({ name: "x.png", type: "image/png", size: 5 }, { decode }).catch((e) => e);
    expect(error).toBeInstanceOf(PhotoError);
    expect(error.message).toBe(PHOTO_FAILED);
  });
});
```

`src/AdminModule/media/storage.test.js`:

```js
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/storage", () => ({
  uploadData: vi.fn(({ options }) => {
    options.onProgress?.({ transferredBytes: 50, totalBytes: 100 });
    return { result: Promise.resolve({ path: "x" }) };
  }),
  remove: vi.fn(async ({ path }) => {
    if (path.includes("fail")) throw new Error("denied");
    return { path };
  }),
}));

import { remove, uploadData } from "aws-amplify/storage";
import { deleteMedia, uploadMedia } from "./storage";

afterEach(() => vi.restoreAllMocks());

describe("uploadMedia", () => {
  it("uploads to the key with its content type and reports progress as a fraction", async () => {
    const onProgress = vi.fn();
    const blob = new Blob(["x"]);
    await expect(uploadMedia({ key: "invitations/i/a.jpg", blob, contentType: "image/jpeg", onProgress })).resolves.toBe("invitations/i/a.jpg");
    expect(uploadData).toHaveBeenCalledWith(expect.objectContaining({ path: "invitations/i/a.jpg", data: blob, options: expect.objectContaining({ contentType: "image/jpeg" }) }));
    expect(onProgress).toHaveBeenCalledWith(0.5);
  });
});

describe("deleteMedia", () => {
  it("deletes every key and only logs failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(deleteMedia(["invitations/i/a.jpg", "invitations/i/fail.jpg"])).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
```

`src/AdminModule/media/useUploads.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { UPLOAD_FAILED, useUploads } from "./useUploads";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useUploads", () => {
  it("tracks progress, marks busy, and hands the result over when done", async () => {
    const d = deferred();
    let report;
    const onDone = vi.fn();
    const { result } = renderHook(() => useUploads());
    act(() => {
      result.current.start({ label: "a.jpg", run: (onProgress) => ((report = onProgress), d.promise), onDone });
    });
    expect(result.current.busy).toBe(true);
    act(() => report(0.4));
    expect(result.current.items[0]).toMatchObject({ label: "a.jpg", status: "uploading", progress: 0.4 });
    await act(async () => d.resolve("invitations/i/a.jpg"));
    expect(onDone).toHaveBeenCalledWith("invitations/i/a.jpg");
    expect(result.current.items).toEqual([]);
    expect(result.current.busy).toBe(false);
  });

  it("keeps a failed upload for retry, with a friendly message", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce("k");
    const onDone = vi.fn();
    const { result } = renderHook(() => useUploads());
    await act(async () => {
      result.current.start({ label: "a.jpg", run, onDone });
    });
    expect(result.current.items[0]).toMatchObject({ status: "failed", error: UPLOAD_FAILED });
    expect(result.current.busy).toBe(false);
    await act(async () => result.current.retry(result.current.items[0].id));
    expect(onDone).toHaveBeenCalledWith("k");
    expect(result.current.items).toEqual([]);
  });

  it("shows the photo's own explanation when it has one", async () => {
    const run = vi.fn().mockRejectedValue(Object.assign(new Error("Couldn't read that iPhone photo — export it as JPG and try again."), { friendly: true }));
    const { result } = renderHook(() => useUploads());
    await act(async () => {
      result.current.start({ label: "x.heic", run, onDone: vi.fn() });
    });
    expect(result.current.items[0].error).toMatch(/iPhone photo/);
  });

  it("can dismiss a failed upload", async () => {
    const { result } = renderHook(() => useUploads());
    await act(async () => {
      result.current.start({ label: "a.jpg", run: () => Promise.reject(new Error("x")), onDone: vi.fn() });
    });
    act(() => result.current.dismiss(result.current.items[0].id));
    expect(result.current.items).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/media`
Expected: FAIL. The modules can't be resolved.

- [ ] **Step 4: Implement the checks**

`src/AdminModule/media/files.js`:

```js
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_MUSIC_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_SIDE = 2000;
export const PHOTO_QUALITY = 0.82;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
export const MUSIC_ACCEPT = "audio/mpeg,.mp3";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Windows often reports no type for .heic files, so the extension counts too.
export const isHeic = (file) => /^image\/hei[cf]$/.test(file?.type ?? "") || /\.hei[cf]$/i.test(file?.name ?? "");

export function validatePhoto(file) {
  if (!file?.size) return "That file is empty — choose another photo.";
  if (!PHOTO_TYPES.includes(file.type) && !isHeic(file)) return "Use a JPG, PNG, WebP or iPhone photo.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is over 25 MB.";
  return null;
}

export function validateMusic(file) {
  if (!file?.size) return "That file is empty — choose another song.";
  const mp3 = ["audio/mpeg", "audio/mp3"].includes(file.type) || /\.mp3$/i.test(file.name ?? "");
  if (!mp3 || file.size > MAX_MUSIC_BYTES) return "Choose an MP3 under 10 MB.";
  return null;
}

export function fitWithin(width, height, maxSide = PHOTO_MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const randomId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");

export const newKey = (folder, ext) => `${folder}${randomId()}.${ext}`;
```

- [ ] **Step 5: Implement photo preparation**

`src/AdminModule/media/photos.js`:

```js
import { fitWithin, isHeic, PHOTO_QUALITY } from "./files";

export const HEIC_FAILED = "Couldn't read that iPhone photo — export it as JPG and try again.";
export const PHOTO_FAILED = "Couldn't read that photo — try another one.";

export class PhotoError extends Error {
  friendly = true;
}

// The converter is large, so it only loads when someone actually picks an iPhone photo.
async function convertHeicInBrowser(file) {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(result) ? result[0] : result;
}

// "from-image" applies the photo's EXIF rotation, so portrait phone photos stay upright.
const decodeInBrowser = (blob) => createImageBitmap(blob, { imageOrientation: "from-image" });

function encodeInBrowser(bitmap, { width, height }, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/jpeg", quality);
  });
}

/** A JPEG no larger than 2000 px on its longest side, ready to upload. */
export async function preparePhoto(file, { convertHeic = convertHeicInBrowser, decode = decodeInBrowser, encode = encodeInBrowser } = {}) {
  let source = file;
  if (isHeic(file)) {
    try {
      source = await convertHeic(file);
    } catch {
      throw new PhotoError(HEIC_FAILED);
    }
  }
  let bitmap;
  try {
    bitmap = await decode(source);
  } catch {
    throw new PhotoError(PHOTO_FAILED);
  }
  try {
    return await encode(bitmap, fitWithin(bitmap.width, bitmap.height), PHOTO_QUALITY);
  } catch {
    throw new PhotoError(PHOTO_FAILED);
  } finally {
    bitmap.close?.();
  }
}
```

- [ ] **Step 6: Implement audio duration, storage and the upload queue**

`src/AdminModule/media/audio.js`:

```js
const TIMEOUT_MS = 10_000;

/** Song length in whole seconds, or null if the browser can't tell. */
export function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    audio.onerror = () => finish(null);
    setTimeout(() => finish(null), TIMEOUT_MS);
    audio.src = url;
  });
}
```

`src/AdminModule/media/storage.js`:

```js
import { remove, uploadData } from "aws-amplify/storage";

/** Uploads straight from the browser to S3 with the signed-in staff member's credentials. */
export async function uploadMedia({ key, blob, contentType, onProgress }) {
  await uploadData({
    path: key,
    data: blob,
    options: {
      contentType,
      onProgress: ({ transferredBytes, totalBytes }) => onProgress?.(totalBytes ? transferredBytes / totalBytes : 0),
    },
  }).result;
  return key;
}

/** Best effort: a file that can't be deleted stays until the invitation's folder is purged (Phase 5). */
export async function deleteMedia(keys) {
  const results = await Promise.allSettled(keys.map((path) => remove({ path })));
  results.forEach((outcome, i) => {
    if (outcome.status === "rejected") console.warn("Couldn't delete", keys[i], outcome.reason);
  });
}
```

`src/AdminModule/media/useUploads.js`:

```js
"use client";

import { useCallback, useRef, useState } from "react";
import { randomId } from "./files";

export const UPLOAD_FAILED = "Couldn't upload — check the connection and retry.";

/** A small upload queue: progress per item, failed items stay for Retry, `busy` while anything is uploading. */
export function useUploads() {
  const [items, setItems] = useState([]);
  const jobs = useRef(new Map());

  const patch = useCallback((id, change) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const execute = useCallback(
    async (id) => {
      const job = jobs.current.get(id);
      if (!job) return;
      patch(id, { status: "uploading", progress: 0, error: null });
      try {
        const result = await job.run((progress) => patch(id, { progress }));
        jobs.current.delete(id);
        setItems((list) => list.filter((item) => item.id !== id));
        job.onDone(result);
      } catch (err) {
        patch(id, { status: "failed", error: err?.friendly ? err.message : UPLOAD_FAILED });
      }
    },
    [patch],
  );

  const start = useCallback(
    (job) => {
      const id = randomId();
      jobs.current.set(id, job);
      setItems((list) => [...list, { id, label: job.label, group: job.group ?? null, status: "uploading", progress: 0, error: null }]);
      execute(id);
      return id;
    },
    [execute],
  );

  const retry = useCallback((id) => execute(id), [execute]);

  const dismiss = useCallback((id) => {
    jobs.current.delete(id);
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  return { items, start, retry, dismiss, busy: items.some((item) => item.status === "uploading") };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/media`
Expected: PASS (all four files).

- [ ] **Step 8: Run all tests and commit**

```bash
npm test
git add package.json package-lock.json src/AdminModule/media
git commit -m "feat(media): add photo checks, HEIC conversion, compression and an upload queue"
```

---

### Task 5: Editor step ⑤ — photos and music, with safe deletes and the leave guard

**Files:**
- Create: `src/AdminModule/editor/media/UploadStatus.jsx`, `src/AdminModule/editor/media/PhotoSlot.jsx`, `src/AdminModule/editor/media/GalleryEditor.jsx`, `src/AdminModule/editor/media/MusicPicker.jsx`, `src/AdminModule/editor/media/media.test.jsx`
- Modify: `src/AdminModule/editor/steps/MediaStep.jsx`, `src/AdminModule/editor/steps/MediaStep.test.jsx`, `src/AdminModule/editor/EditorShell.jsx`, `src/AdminModule/editor/EditorShell.test.jsx`, `src/AdminModule/editor/useAutosave.js`, `src/AdminModule/editor/useAutosave.test.jsx`, `src/AdminModule/editor/test-utils.jsx`, `src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js`, `docs/admin-guide.md`

**Interfaces:**
- Consumes:
  - `invitationFolder`, `removedMediaKeys` (Task 1); `GALLERY_MAX` (Task 1)
  - `listMusicTracks` (Task 3)
  - `validatePhoto`, `validateMusic`, `newKey`, `PHOTO_ACCEPT`, `MUSIC_ACCEPT`, `preparePhoto`, `uploadMedia`, `deleteMedia`, `useUploads` (Task 4)
  - `mediaUrl` (lib/media.js); `getIn` / `setIn` (editor/paths.js); `Group`, `LocalisedInput`, `TextInput` (editor/fields.jsx)
- Produces:
  - **Editor `update(path, valueOrUpdater)`:** a function value is called with the current value at `path`, inside React's functional state update, so concurrent completions never overwrite each other.
  - **Step contract additions:** steps receive `invitationId`, `musicTracks` (`{ id, name, key, durationSec }[]`) and `uploads` (from `useUploads()`).
  - **`useAutosave`:** new option `onSaved(savedContent)`, called only after a successful save, with the exact content that save sent.
  - **`EditorShell`:**
    - new prop `musicTracks` (default `[]`)
    - deletes removed media after successful saves
    - treats uploads in progress as unsaved work (leave guard)
  - **Components:**
    - `PhotoSlot({ label, group, value, onChange(key|undefined), folder, uploads })`
    - `GalleryEditor({ gallery, update, folder, uploads, language })`
    - `MusicPicker({ music, onChange(music|undefined), tracks, folder, uploads })`
    - `UploadStatus({ items, uploads })`
    - `photoJob({ file, folder, group, onDone })`

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/editor/media/media.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// vi.mock factories run before ordinary top-level code, so shared state must be created with vi.hoisted.
const pending = vi.hoisted(() => new Map());
vi.mock("@/AdminModule/media/photos", () => ({
  preparePhoto: vi.fn(async (file) => new Blob([file.name], { type: "image/jpeg" })),
}));
vi.mock("@/AdminModule/media/storage", () => ({
  uploadMedia: vi.fn(({ key, blob }) => {
    const name = blob instanceof Blob && blob.type === "audio/mpeg" ? "song" : "photo";
    return new Promise((resolve) => pending.set(`${name}:${pending.size}`, () => resolve(key)));
  }),
  deleteMedia: vi.fn(async () => {}),
}));

import MediaStep from "../steps/MediaStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });
const jpg = (name) => new File(["x"], name, { type: "image/jpeg" });
const finishAll = async () => {
  const resolvers = [...pending.values()];
  pending.clear();
  await act(async () => resolvers.forEach((resolve) => resolve()));
};
const finishInReverse = async () => {
  const resolvers = [...pending.values()].reverse();
  pending.clear();
  for (const resolve of resolvers) await act(async () => resolve());
};

describe("cover photo", () => {
  it("uploads into this invitation's folder and stores the key", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), jpg("cover.jpg"));
    expect(screen.getByRole("progressbar", { name: "cover.jpg" })).toBeInTheDocument();
    await finishAll();
    expect(latest().media.coverKey).toMatch(/^invitations\/inv-test\/[A-Za-z0-9]+\.jpg$/);
  });

  it("refuses an unsupported file without uploading", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), new File(["x"], "a.gif", { type: "image/gif" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG, PNG, WebP or iPhone photo.");
    expect(pending.size).toBe(0);
    expect(latest().media?.coverKey).toBeUndefined();
  });

  it("removes the cover", async () => {
    const { latest } = renderStep(MediaStep, { ...base(), media: { coverKey: "invitations/inv-test/c.jpg" } });
    await userEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    expect(latest().media.coverKey).toBeUndefined();
  });
});

describe("gallery", () => {
  it("keeps every photo when uploads finish in a different order", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("one.jpg"), jpg("two.jpg"), jpg("three.jpg")]);
    await finishInReverse();
    expect(latest().media.gallery).toHaveLength(3);
    expect(new Set(latest().media.gallery.map((g) => g.key)).size).toBe(3);
  });

  it("stops at 12 photos and says how many were left out", async () => {
    const gallery = Array.from({ length: 11 }, (_, i) => ({ key: `invitations/inv-test/${i}.jpg` }));
    const { latest } = renderStep(MediaStep, { ...base(), media: { gallery } });
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("a.jpg"), jpg("b.jpg"), jpg("c.jpg")]);
    expect(screen.getByRole("alert")).toHaveTextContent("The gallery holds up to 12 photos — 2 not added.");
    await finishAll();
    expect(latest().media.gallery).toHaveLength(12);
    expect(screen.getByText("12 of 12 — the gallery is full")).toBeInTheDocument();
    expect(screen.getByLabelText("Add gallery photos")).toBeDisabled();
  });

  it("captions, reorders and removes photos", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const gallery = [{ key: "invitations/inv-test/a.jpg" }, { key: "invitations/inv-test/b.jpg" }];
    const { latest } = renderStep(MediaStep, { ...base(), media: { gallery } });
    await userEvent.type(screen.getByLabelText("Caption for photo 1"), "First look");
    expect(latest().media.gallery[0].caption).toEqual({ en: "First look" });
    await userEvent.click(screen.getByRole("button", { name: "Move photo 2 left" }));
    expect(latest().media.gallery.map((g) => g.key)).toEqual(["invitations/inv-test/b.jpg", "invitations/inv-test/a.jpg"]);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(latest().media.gallery.map((g) => g.key)).toEqual(["invitations/inv-test/a.jpg"]);
  });
});

describe("music", () => {
  const tracks = [{ id: "t1", name: "Shehnai", key: "music-library/t1.mp3", durationSec: 120 }];

  it("picks a song from the Music Library", async () => {
    const { latest } = renderStep(MediaStep, base(), { musicTracks: tracks });
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Song" }), "t1");
    expect(latest().media.music).toEqual({ type: "library", trackId: "t1", key: "music-library/t1.mp3" });
    await userEvent.click(screen.getByRole("radio", { name: "No music" }));
    expect(latest().media.music).toBeUndefined();
  });

  it("uploads a song for this invitation only", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.click(screen.getByRole("radio", { name: "Upload a song for this invitation" }));
    expect(screen.getByText("Only upload music you have the rights to use.")).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText("Choose a song"), new File(["x"], "song.mp3", { type: "audio/mpeg" }));
    await finishAll();
    expect(latest().media.music).toEqual({ type: "upload", key: expect.stringMatching(/^invitations\/inv-test\/[A-Za-z0-9]+\.mp3$/) });
  });

  it("refuses a song that isn't an MP3", async () => {
    renderStep(MediaStep, base());
    await userEvent.click(screen.getByRole("radio", { name: "Upload a song for this invitation" }));
    await userEvent.upload(screen.getByLabelText("Choose a song"), new File(["x"], "song.wav", { type: "audio/wav" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an MP3 under 10 MB.");
  });

  it("explains when the library is empty", async () => {
    renderStep(MediaStep, base(), { musicTracks: [] });
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    expect(screen.getByText(/No songs in the Music Library yet/)).toBeInTheDocument();
  });
});
```

The upload mock distinguishes music from photos by `blob.type`. `MusicPicker` passes the original `File` (type `audio/mpeg`), so a `song:` resolver is queued. `finishAll` resolves both kinds.

In `src/AdminModule/editor/steps/MediaStep.test.jsx`:
- Delete the test `"says photos and music are coming"`.
- Keep the YouTube tests.
- Add these mocks after the `vitest` import, so rendering `MediaStep` never touches AWS:

```jsx
vi.mock("@/AdminModule/media/storage", () => ({ uploadMedia: vi.fn(async ({ key }) => key), deleteMedia: vi.fn(async () => {}) }));
vi.mock("@/AdminModule/media/photos", () => ({ preparePhoto: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })) }));
```

  Add `vi` to its `vitest` import if it isn't already there.

Append to `src/AdminModule/editor/useAutosave.test.jsx`:

```jsx
describe("useAutosave onSaved", () => {
  it("reports the content each successful save sent, and nothing for failures", async () => {
    const onSaved = vi.fn();
    const save = vi.fn().mockResolvedValueOnce({ ok: false, message: "x" }).mockResolvedValueOnce({ ok: true, version: 2, savedAt: "x" });
    const { result, rerender } = renderHook(({ content }) => useAutosave({ content, initialVersion: 1, save, onSaved }), {
      initialProps: { content: { n: 0 } },
    });
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => result.current.retry());
    expect(onSaved).toHaveBeenCalledWith({ n: 1 });
  });
});
```

In `src/AdminModule/editor/EditorShell.test.jsx`, add these mocks right after the existing imports from `vitest`. `vi.mock` is hoisted, so placement among the imports doesn't matter.

```jsx
vi.mock("@/AdminModule/media/storage", () => ({
  uploadMedia: vi.fn(async ({ key }) => key),
  deleteMedia: vi.fn(async () => {}),
}));
vi.mock("@/AdminModule/media/photos", () => ({
  preparePhoto: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })),
}));
```

Then append:

```jsx
describe("EditorShell media", () => {
  it("deletes a removed photo only after the save that drops it succeeds", async () => {
    const { deleteMedia } = await import("@/AdminModule/media/storage");
    const withCover = { ...invitation, content: { ...invitation.content, media: { coverKey: "invitations/inv-1/old.jpg" } } };
    const saveAction = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." }).mockResolvedValueOnce({ ok: true, version: 6, savedAt: "x" });
    render(<EditorShell invitation={withCover} initialStep={5} templates={TEMPLATE_CHOICES} saveAction={saveAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    await act(async () => vi.advanceTimersByTime(3000));
    expect(deleteMedia).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(deleteMedia).toHaveBeenCalledWith(["invitations/inv-1/old.jpg"]);
  });

  it("warns before closing the tab while a photo is uploading", async () => {
    const { preparePhoto } = await import("@/AdminModule/media/photos");
    preparePhoto.mockImplementationOnce(() => new Promise(() => {}));
    render(<EditorShell invitation={invitation} initialStep={5} templates={TEMPLATE_CHOICES} saveAction={vi.fn()} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Choose cover photo"), { target: { files: [new File(["x"], "c.jpg", { type: "image/jpeg" })] } });
    });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
```

`invitation` in that test file has `id: "inv-1"`. If the existing fixture uses another id, use that id in the cover key so it sits inside the invitation's own folder.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/editor`
Expected: FAIL. The media components don't exist, `onSaved` isn't called, and the shell doesn't delete or guard uploads.

- [ ] **Step 3: Support updater functions and media props in the editor**

`src/AdminModule/editor/test-utils.jsx`:
- Import `useUploads` from `@/AdminModule/media/useUploads` and `getIn` from `./paths`.
- In `Harness`, replace the `update` line and pass the new props:

```jsx
    const uploads = useUploads();
    const update = (path, value) => setContent((c) => setIn(c, path, typeof value === "function" ? value(getIn(c, path)) : value));
    const { errors } = cleanDraft(content);
    return (
      <Step
        content={content}
        update={update}
        errors={errors}
        language={content.language ?? "en"}
        templates={TEMPLATE_CHOICES}
        onGoToStep={() => {}}
        invitationId="inv-test"
        musicTracks={[]}
        uploads={uploads}
        {...extraProps}
      />
    );
```

`src/AdminModule/editor/useAutosave.js`:
- Accept `onSaved` in the options: `export function useAutosave({ content, initialVersion, save, onSaved, delay = SAVE_DELAY_MS })`.
- Keep it in a ref next to `saveRef`: `const onSavedRef = useRef(onSaved); onSavedRef.current = onSaved;`.
- In `runSave`, capture the content being sent and report it on success:

```js
    const run = (async () => {
      const sent = latest.current.content;
      let result;
      try {
        result = await saveRef.current({ content: sent, expectedVersion: latest.current.version });
        // No answer at all usually means the session ended and the request was redirected to sign-in.
        if (result === undefined) result = { ok: false, message: SIGNED_OUT };
      } catch {
        result = { ok: false, message: FAILED };
      }
      inFlight.current = null;
      if (result?.ok) {
        dispatch({ type: "success", version: result.version, savedAt: result.savedAt });
        onSavedRef.current?.(sent);
      } else if (result?.conflict) dispatch({ type: "conflict" });
      else dispatch({ type: "failure", message: result?.message ?? FAILED });
      return result;
    })();
```

`src/AdminModule/editor/EditorShell.jsx`:
- Add the imports:

```jsx
import { removedMediaKeys } from "@/InvitationModule/lib/mediaKeys";
import { deleteMedia } from "@/AdminModule/media/storage";
import { useUploads } from "@/AdminModule/media/useUploads";
import { getIn, setIn } from "./paths";
```

  Replace the existing `import { setIn } from "./paths";`.
- Change the signature to `export default function EditorShell({ invitation, initialStep, templates, saveAction, musicTracks = [] })`.
- After the `save` callback, add the upload queue and delete-after-save:

```jsx
  const uploads = useUploads();
  // Files are deleted only after a save that no longer references them has succeeded.
  const lastSaved = useRef(invitation.content);
  const onSaved = useCallback(
    (saved) => {
      const removed = removedMediaKeys(lastSaved.current, saved, invitation.id);
      lastSaved.current = saved;
      if (removed.length > 0) deleteMedia(removed);
    },
    [invitation.id],
  );
  const { state, retry, flushNow } = useAutosave({ content, initialVersion: invitation.version, save, onSaved });
```

  It replaces the existing `useAutosave(...)` line.
- Include uploads in the leave guard:

```jsx
  const atRisk = uploads.busy || state.status === "error" || state.status === "conflict" || (state.status === "saving" && state.queued);
  const allowLeave = useLeaveGuard({ warnOnClose: uploads.busy || hasUnsavedChanges(state), atRisk, flushNow });
```

- Make `update` accept updater functions:

```jsx
  const update = useCallback(
    (path, value) => setContent((c) => setIn(c, path, typeof value === "function" ? value(getIn(c, path)) : value)),
    [],
  );
```

- Pass the new props to the step:

```jsx
            <Step
              content={content}
              update={update}
              errors={errors}
              language={content.language ?? "en"}
              templates={templates}
              onGoToStep={goTo}
              invitationId={invitation.id}
              musicTracks={musicTracks}
              uploads={uploads}
            />
```

`src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js`:
- Import `listMusicTracks` from `@/AdminModule/music/data`.
- Load the tracks next to the invitation (if loading fails, the editor still opens without the library):

```js
  let musicTracks = [];
  try {
    musicTracks = (await listMusicTracks()).map(({ id, name, key, durationSec }) => ({ id, name, key, durationSec }));
  } catch (err) {
    console.error("listMusicTracks failed", err);
  }
```

- Pass `musicTracks={musicTracks}` to `EditorShell`.

- [ ] **Step 4: Implement the media components**

`src/AdminModule/editor/media/UploadStatus.jsx`:

```jsx
"use client";

const small = "min-h-[44px] rounded-full border border-stone-300 px-3 text-xs hover:bg-stone-100";

/** Progress bars for uploads in progress, and Retry / Dismiss for failed ones. */
export default function UploadStatus({ items, uploads }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="text-xs">
          {item.status === "uploading" ? (
            <div>
              <span className="text-stone-600">Uploading {item.label}…</span>
              <div role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)} className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-stone-800" style={{ width: `${Math.round(item.progress * 100)}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-red-700">
              <span role="alert">
                {item.label}: {item.error}
              </span>
              <button type="button" onClick={() => uploads.retry(item.id)} className={small}>
                Retry
              </button>
              <button type="button" onClick={() => uploads.dismiss(item.id)} className={small}>
                Dismiss
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

`src/AdminModule/editor/media/PhotoSlot.jsx`:

```jsx
"use client";

import { useState } from "react";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { newKey, PHOTO_ACCEPT, validatePhoto } from "@/AdminModule/media/files";
import { preparePhoto } from "@/AdminModule/media/photos";
import { uploadMedia } from "@/AdminModule/media/storage";
import UploadStatus from "./UploadStatus";

export const pickerButton =
  "relative inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 focus-within:ring-2 focus-within:ring-stone-400";

/** One upload job: compress (and convert iPhone photos), then upload into the invitation's folder. */
export function photoJob({ file, folder, group, onDone }) {
  return {
    label: file.name,
    group,
    onDone,
    run: async (onProgress) => {
      const blob = await preparePhoto(file);
      return uploadMedia({ key: newKey(folder, "jpg"), blob, contentType: "image/jpeg", onProgress });
    },
  };
}

export default function PhotoSlot({ label, group, value, onChange, folder, uploads }) {
  const [error, setError] = useState(null);
  const items = uploads.items.filter((item) => item.group === group);

  function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validatePhoto(file);
    setError(problem);
    if (!problem) uploads.start(photoJob({ file, folder, group, onDone: onChange }));
  }

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {value ? (
          <img src={mediaUrl(value)} alt="" className="h-24 w-24 rounded-lg border border-stone-200 object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-400">No photo</div>
        )}
        <label className={pickerButton}>
          {value ? "Replace" : "Upload"}
          <input type="file" accept={PHOTO_ACCEPT} aria-label={`Choose ${label.toLowerCase()}`} onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        {value && (
          <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange(undefined)} className={pickerButton}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      <UploadStatus items={items} uploads={uploads} />
    </div>
  );
}
```

`src/AdminModule/editor/media/GalleryEditor.jsx`:

```jsx
"use client";

import { useState } from "react";
import { GALLERY_MAX } from "@/InvitationModule/schema/invitation";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { PHOTO_ACCEPT, validatePhoto } from "@/AdminModule/media/files";
import { LocalisedInput } from "../fields";
import { photoJob, pickerButton } from "./PhotoSlot";
import UploadStatus from "./UploadStatus";

const small = "min-h-[44px] rounded-full border border-stone-300 px-3 text-sm hover:bg-stone-100 disabled:opacity-40";
const GALLERY = ["media", "gallery"];

function moved(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function GalleryEditor({ gallery = [], update, folder, uploads, language }) {
  const [problems, setProblems] = useState([]);
  const items = uploads.items.filter((item) => item.group === "gallery");
  const uploading = items.filter((item) => item.status === "uploading").length;
  const room = Math.max(0, GALLERY_MAX - gallery.length - uploading);
  const full = gallery.length >= GALLERY_MAX;

  function pick(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    const found = [];
    const accepted = [];
    for (const file of files) {
      const problem = validatePhoto(file);
      if (problem) found.push(`${file.name}: ${problem}`);
      else accepted.push(file);
    }
    const allowed = accepted.slice(0, room);
    if (accepted.length > allowed.length) {
      found.push(`The gallery holds up to ${GALLERY_MAX} photos — ${accepted.length - allowed.length} not added.`);
    }
    setProblems(found);
    for (const file of allowed) {
      uploads.start(photoJob({ file, folder, group: "gallery", onDone: (key) => update(GALLERY, (current = []) => [...current, { key }]) }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${pickerButton} ${full ? "pointer-events-none opacity-40" : ""}`}>
          Add photos
          <input type="file" multiple accept={PHOTO_ACCEPT} aria-label="Add gallery photos" disabled={full} onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <span className="text-sm text-stone-600">{full ? `${GALLERY_MAX} of ${GALLERY_MAX} — the gallery is full` : `${gallery.length} of ${GALLERY_MAX}`}</span>
      </div>
      {problems.length > 0 && (
        <div role="alert" className="space-y-1 text-xs text-red-700">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      )}
      <UploadStatus items={items} uploads={uploads} />
      <ol className="grid gap-4 sm:grid-cols-2">
        {gallery.map((photo, i) => (
          <li key={photo.key} className="space-y-2 rounded-xl border border-stone-200 p-3">
            <img src={mediaUrl(photo.key)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
            <LocalisedInput
              label={`Caption for photo ${i + 1}`}
              value={photo.caption}
              language={language}
              onChange={(caption) => update([...GALLERY, i, "caption"], caption)}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={i === 0} aria-label={`Move photo ${i + 1} left`} onClick={() => update(GALLERY, (current = []) => moved(current, i, i - 1))} className={small}>
                ←
              </button>
              <button type="button" disabled={i === gallery.length - 1} aria-label={`Move photo ${i + 1} right`} onClick={() => update(GALLERY, (current = []) => moved(current, i, i + 1))} className={small}>
                →
              </button>
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => {
                  if (window.confirm("Remove this photo? This can't be undone.")) update(GALLERY, (current = []) => current.filter((_, j) => j !== i));
                }}
                className={small}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

`src/AdminModule/editor/media/MusicPicker.jsx`:

```jsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { MUSIC_ACCEPT, newKey, validateMusic } from "@/AdminModule/media/files";
import { uploadMedia } from "@/AdminModule/media/storage";
import { pickerButton } from "./PhotoSlot";
import UploadStatus from "./UploadStatus";

const selectClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm";

function PlayButton({ src, label }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  useEffect(() => {
    audio.current?.pause();
    setPlaying(false);
  }, [src]);
  if (!src) return null;
  return (
    <>
      <audio ref={audio} src={src} preload="none" onEnded={() => setPlaying(false)} />
      <button
        type="button"
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        onClick={() => {
          if (playing) {
            audio.current.pause();
            setPlaying(false);
          } else {
            audio.current.play().catch(() => {});
            setPlaying(true);
          }
        }}
        className={pickerButton}
      >
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
    </>
  );
}

export default function MusicPicker({ music, onChange, tracks, folder, uploads }) {
  const [mode, setMode] = useState(music?.type ?? "none");
  const [error, setError] = useState(null);
  const songId = useId();
  const items = uploads.items.filter((item) => item.group === "music");
  const libraryTrack = music?.type === "library" ? tracks.find((t) => t.id === music.trackId) : null;

  function choose(next) {
    setMode(next);
    setError(null);
    if (next === "none") onChange(undefined);
  }

  function pickSong(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validateMusic(file);
    setError(problem);
    if (problem) return;
    uploads.start({
      label: file.name,
      group: "music",
      run: (onProgress) => uploadMedia({ key: newKey(folder, "mp3"), blob: file, contentType: "audio/mpeg", onProgress }),
      onDone: (key) => onChange({ type: "upload", key }),
    });
  }

  const option = (value, text) => (
    <label className="flex min-h-[44px] items-center gap-2 text-sm">
      <input type="radio" name="music-mode" value={value} checked={mode === value} onChange={() => choose(value)} className="h-5 w-5" />
      {text}
    </label>
  );

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Background music">
        {option("none", "No music")}
        {option("library", "From the Music Library")}
        {option("upload", "Upload a song for this invitation")}
      </div>

      {mode === "library" &&
        (tracks.length === 0 ? (
          <p className="text-sm text-stone-600">No songs in the Music Library yet — add some under Music in the menu.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor={songId} className="text-sm font-medium">
                Song
              </label>
              <select
                id={songId}
                value={music?.type === "library" ? music.trackId : ""}
                onChange={(e) => {
                  const track = tracks.find((t) => t.id === e.target.value);
                  onChange(track ? { type: "library", trackId: track.id, key: track.key } : undefined);
                }}
                className={selectClass}
              >
                <option value="">Choose a song…</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {libraryTrack && <PlayButton src={mediaUrl(libraryTrack.key)} label={libraryTrack.name} />}
          </div>
        ))}

      {mode === "upload" && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">Only upload music you have the rights to use.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className={pickerButton}>
              {music?.type === "upload" ? "Replace song" : "Choose MP3"}
              <input type="file" accept={MUSIC_ACCEPT} aria-label="Choose a song" onChange={pickSong} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            {music?.type === "upload" && <PlayButton src={mediaUrl(music.key)} label="the uploaded song" />}
          </div>
          <UploadStatus items={items} uploads={uploads} />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Rebuild step ⑤**

`src/AdminModule/editor/steps/MediaStep.jsx`: replace the file with:

```jsx
"use client";

import { invitationFolder } from "@/InvitationModule/lib/mediaKeys";
import { youtubeId } from "@/InvitationModule/lib/media";
import { Group, TextInput } from "../fields";
import GalleryEditor from "../media/GalleryEditor";
import MusicPicker from "../media/MusicPicker";
import PhotoSlot from "../media/PhotoSlot";

export default function MediaStep({ content, update, errors, language, invitationId, musicTracks = [], uploads }) {
  const folder = invitationFolder(invitationId);
  const url = content.media?.film?.url ?? "";
  const invalid = Boolean(url) && (!youtubeId(url) || Boolean(errors["media.film.url"]));

  return (
    <div className="space-y-6">
      <Group title="Cover photo">
        <PhotoSlot label="Cover photo" group="cover" value={content.media?.coverKey} onChange={(key) => update(["media", "coverKey"], key)} folder={folder} uploads={uploads} />
      </Group>

      <Group title="Couple photos (optional)">
        <div className="grid gap-6 sm:grid-cols-2">
          <PhotoSlot label="Bride's photo" group="bride" value={content.couple?.bride?.photoKey} onChange={(key) => update(["couple", "bride", "photoKey"], key)} folder={folder} uploads={uploads} />
          <PhotoSlot label="Groom's photo" group="groom" value={content.couple?.groom?.photoKey} onChange={(key) => update(["couple", "groom", "photoKey"], key)} folder={folder} uploads={uploads} />
        </div>
      </Group>

      <Group title="Photo gallery">
        <GalleryEditor gallery={content.media?.gallery} update={update} folder={folder} uploads={uploads} language={language} />
      </Group>

      <Group title="Invitation film">
        <TextInput
          label="YouTube link"
          type="url"
          value={url}
          error={invalid ? "Paste a YouTube link, like https://youtu.be/…" : undefined}
          hint="Upload the film to YouTube (it can be unlisted), then paste its link here."
          onChange={(v) => update(["media", "film"], v.trim() ? { type: "youtube", url: v.trim() } : undefined)}
        />
      </Group>

      <Group title="Background music">
        <MusicPicker music={content.media?.music} onChange={(music) => update(["media", "music"], music)} tracks={musicTracks} folder={folder} uploads={uploads} />
      </Group>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/editor`
Expected: PASS (all editor test files). If `userEvent.upload` doesn't fire `change` on an input hidden with `opacity-0`, keep the tests and use `fireEvent.change(input, { target: { files } })` in a small local helper instead. Note this in the report.

- [ ] **Step 7: Update the staff guide**

`docs/admin-guide.md`: replace the whole `## Editor step 5: Photos, film & music` section with:

```markdown
## Editor step 5: Photos, film & music

**Photos you can use:** JPG/JPEG, PNG, WebP and iPhone photos (HEIC). Pixel phone photos ("PXL_…") are ordinary JPGs. iPhone photos are converted automatically. Every photo is resized and compressed so the invitation loads quickly on phones. Photos sent to you on WhatsApp work too.

- **Cover photo:** the big photo at the top of the invitation. Click **Upload**, pick a photo, and wait for the bar to finish. Use **Replace** or **Remove** to change it.
- **Couple photos (optional):** one for the bride and one for the groom, shown in "The couple" section.
- **Photo gallery:** click **Add photos** and pick up to 12 at once. Each photo can have a caption. Use the arrows to change the order and **Remove** to take one out. When the gallery holds 12 photos it's full.
- **Invitation film:** paste the film's **YouTube link**. The film can be "unlisted" on YouTube.
- **Background music:** choose **No music**, a song **From the Music Library**, or **Upload a song for this invitation** (MP3 up to 10 MB). Press **▶ Play** to listen first. Only upload music you have the rights to use.

If an upload fails, click **Retry** next to it. Your other changes are already saved. Don't close the page while a photo is still uploading.
```

- [ ] **Step 8: Run all tests, build and commit**

```bash
npm test
npx next build
git add src/AdminModule/editor "src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js" docs/admin-guide.md
git commit -m "feat(editor): add cover, couple, gallery and music uploads to step 5"
```

Expected: tests pass and the build succeeds.

---

### Task 6: Music Library page

**Files:**
- Create: `src/AdminModule/music/MusicLibrary.jsx`, `src/AdminModule/music/MusicLibrary.test.jsx`, `src/app/(admin)/admin/(staff)/music/page.js`
- Modify: `src/AdminModule/editor/media/MusicPicker.jsx` (export `PlayButton`), `src/AdminModule/AdminShell.jsx`, `src/AdminModule/AdminShell.test.jsx`, `docs/admin-guide.md`

**Interfaces:**
- Consumes:
  - `listMusicTracks`, `createMusicTrackAction`, `renameMusicTrackAction`, `deleteMusicTrackAction`, `usageByTrack`, `trackNameFromFile`, `formatDuration`, `validateTrackName`, `usedByMessage` (Task 3)
  - `listInvitations` (2a/Task 3)
  - `validateMusic`, `newKey`, `MUSIC_ACCEPT`, `uploadMedia`, `deleteMedia`, `readDuration` (Task 4); `LIBRARY_PREFIX` (Task 1)
  - `PlayButton` (Task 5)
- Produces:
  - `MusicLibrary({ tracks, usage, createAction, renameAction, deleteAction })`
  - the `/admin/music` page
  - a **Music** sidebar item: `navFor` lists Dashboard, Invitations, Templates, Music, [Staff], Help

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/music/MusicLibrary.test.jsx`:

```jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/AdminModule/media/storage", () => ({ uploadMedia: vi.fn(async ({ key }) => key), deleteMedia: vi.fn(async () => {}) }));
vi.mock("@/AdminModule/media/audio", () => ({ readDuration: vi.fn(async () => 95) }));

import { deleteMedia, uploadMedia } from "@/AdminModule/media/storage";
import MusicLibrary from "./MusicLibrary";

const tracks = [
  { id: "t1", name: "Shehnai", key: "music-library/t1.mp3", durationSec: 195, createdBy: "neha@example.com", createdAt: "2026-10-01T10:00:00.000Z" },
  { id: "t2", name: "Dhol Beat", key: "music-library/t2.mp3", durationSec: 61, createdBy: "amit@example.com", createdAt: "2026-10-02T10:00:00.000Z" },
];
const usage = { t1: ["Priya & Rahul", "Neha & Arjun"] };

function setup(overrides = {}) {
  const props = {
    tracks,
    usage,
    createAction: vi.fn(async ({ name }) => ({ ok: true, track: { id: "t3", name } })),
    renameAction: vi.fn(async () => ({ ok: true })),
    deleteAction: vi.fn(async () => ({ ok: true, key: "music-library/t2.mp3" })),
    ...overrides,
  };
  render(<MusicLibrary {...props} />);
  return props;
}

const row = (name) => screen.getByText(name).closest("li");

afterEach(() => vi.clearAllMocks());

describe("MusicLibrary", () => {
  it("lists songs with their length, who added them and which invitations use them", () => {
    setup();
    expect(within(row("Shehnai")).getByText(/3:15/)).toBeInTheDocument();
    expect(within(row("Shehnai")).getByText("Used by: Priya & Rahul, Neha & Arjun")).toBeInTheDocument();
    expect(within(row("Dhol Beat")).getByText("Not used yet")).toBeInTheDocument();
  });

  it("won't delete a song that invitations use", () => {
    setup();
    expect(within(row("Shehnai")).getByRole("button", { name: "Delete Shehnai" })).toBeDisabled();
    expect(within(row("Shehnai")).getByText("Used by 2 invitations — change their music first.")).toBeInTheDocument();
  });

  it("adds a song to the library folder with a name defaulted from the file", async () => {
    const { createAction } = setup();
    await userEvent.upload(screen.getByLabelText("Choose an MP3"), new File(["x"], "Wedding_Entry.mp3", { type: "audio/mpeg" }));
    expect(screen.getByLabelText("Song name")).toHaveValue("Wedding Entry");
    expect(screen.getByText("Only upload music you have the rights to use.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Upload song" }));
    const key = uploadMedia.mock.calls[0][0].key;
    expect(key).toMatch(/^music-library\/[A-Za-z0-9]+\.mp3$/);
    expect(createAction).toHaveBeenCalledWith({ name: "Wedding Entry", key, durationSec: 95 });
    expect(await screen.findByRole("status")).toHaveTextContent('Added "Wedding Entry".');
  });

  it("removes the uploaded file if the song can't be saved", async () => {
    setup({ createAction: vi.fn(async () => ({ ok: false, message: "Something went wrong. Please try again." })) });
    await userEvent.upload(screen.getByLabelText("Choose an MP3"), new File(["x"], "a.mp3", { type: "audio/mpeg" }));
    await userEvent.click(screen.getByRole("button", { name: "Upload song" }));
    expect(deleteMedia).toHaveBeenCalledWith([uploadMedia.mock.calls[0][0].key]);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("refuses files that aren't MP3", async () => {
    setup();
    await userEvent.upload(screen.getByLabelText("Choose an MP3"), new File(["x"], "a.wav", { type: "audio/wav" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an MP3 under 10 MB.");
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("renames a song", async () => {
    const { renameAction } = setup();
    await userEvent.click(within(row("Dhol Beat")).getByRole("button", { name: "Rename Dhol Beat" }));
    const input = screen.getByLabelText("New name for Dhol Beat");
    await userEvent.clear(input);
    await userEvent.type(input, "Dhol Entry");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(renameAction).toHaveBeenCalledWith({ id: "t2", name: "Dhol Entry" });
  });

  it("deletes an unused song and then its file", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { deleteAction } = setup();
    await userEvent.click(within(row("Dhol Beat")).getByRole("button", { name: "Delete Dhol Beat" }));
    expect(deleteAction).toHaveBeenCalledWith({ id: "t2" });
    expect(deleteMedia).toHaveBeenCalledWith(["music-library/t2.mp3"]);
  });

  it("invites staff to add the first song", () => {
    render(<MusicLibrary tracks={[]} usage={{}} createAction={vi.fn()} renameAction={vi.fn()} deleteAction={vi.fn()} />);
    expect(screen.getByText("No songs yet. Add the first one above.")).toBeInTheDocument();
  });
});
```

`src/AdminModule/AdminShell.test.jsx`: change the two `navFor` expectations to:

```jsx
    expect(navFor({ isOwner: true }).map((i) => i.label)).toEqual(["Dashboard", "Invitations", "Templates", "Music", "Staff", "Help"]);
    expect(navFor({ isOwner: false }).map((i) => i.label)).toEqual(["Dashboard", "Invitations", "Templates", "Music", "Help"]);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/music src/AdminModule/AdminShell.test.jsx`
Expected: FAIL. `./MusicLibrary` can't be resolved, and the nav has no Music item.

- [ ] **Step 3: Share the play button and add the nav item**

- `src/AdminModule/editor/media/MusicPicker.jsx`: change `function PlayButton(` to `export function PlayButton(`.
- `src/AdminModule/AdminShell.jsx`: in `navFor`, add `{ href: "/admin/music", label: "Music" },` right after the Templates entry.

- [ ] **Step 4: Implement the page component**

`src/AdminModule/music/MusicLibrary.jsx`:

```jsx
"use client";

import { useState } from "react";
import { LIBRARY_PREFIX } from "@/InvitationModule/lib/mediaKeys";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { MUSIC_ACCEPT, newKey, validateMusic } from "@/AdminModule/media/files";
import { readDuration } from "@/AdminModule/media/audio";
import { deleteMedia, uploadMedia } from "@/AdminModule/media/storage";
import { PlayButton } from "@/AdminModule/editor/media/MusicPicker";
import { pickerButton } from "@/AdminModule/editor/media/PhotoSlot";
import { formatDuration, trackNameFromFile, usedByMessage, validateTrackName } from "./library";

const inputClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm";
const small = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-40";
const UPLOAD_FAILED = "Couldn't upload the song — check the connection and try again.";
const addedOn = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function AddTrack({ createAction, onResult }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function pick(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = validateMusic(chosen);
    setError(problem);
    if (problem) {
      setFile(null);
      return;
    }
    setFile(chosen);
    if (!name.trim()) setName(trackNameFromFile(chosen.name));
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Choose an MP3 first.");
    const nameError = validateTrackName(name);
    if (nameError) return setError(nameError);
    setBusy(true);
    setError(null);
    const key = newKey(LIBRARY_PREFIX, "mp3");
    try {
      const [, durationSec] = await Promise.all([uploadMedia({ key, blob: file, contentType: "audio/mpeg" }), readDuration(file)]);
      const result = await createAction({ name: name.trim(), key, durationSec });
      if (!result?.ok) {
        await deleteMedia([key]);
        setError(result?.message ?? UPLOAD_FAILED);
        return;
      }
      setFile(null);
      setName("");
      onResult({ ok: true, message: `Added "${result.track.name}".` });
    } catch {
      await deleteMedia([key]);
      setError(UPLOAD_FAILED);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Add a song</h2>
      <p className="text-sm text-stone-600">Only upload music you have the rights to use.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className={pickerButton}>
          {file ? file.name : "Choose MP3"}
          <input type="file" accept={MUSIC_ACCEPT} aria-label="Choose an MP3" onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <label className="min-w-0 flex-1 text-sm font-medium">
          Song name
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={busy} className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-60">
          {busy ? "Uploading…" : "Upload song"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

function TrackRow({ track, usedBy, renameAction, deleteAction, onResult }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(track.name);
  const [busy, setBusy] = useState(false);
  const inUse = usedBy.length > 0;

  async function rename() {
    setBusy(true);
    const result = await renameAction({ id: track.id, name });
    setBusy(false);
    if (result?.ok) setEditing(false);
    onResult(result?.ok ? { ok: true, message: "Name saved." } : { ok: false, message: result?.message ?? "Couldn't save the name." });
  }

  async function remove() {
    if (!window.confirm(`Delete "${track.name}" from the Music Library? This can't be undone.`)) return;
    setBusy(true);
    const result = await deleteAction({ id: track.id });
    setBusy(false);
    if (result?.ok) {
      if (result.key) await deleteMedia([result.key]);
      onResult({ ok: true, message: `Deleted "${track.name}".` });
    } else {
      onResult({ ok: false, message: result?.message ?? "Couldn't delete the song." });
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input aria-label={`New name for ${track.name}`} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        ) : (
          <p className="font-medium">{track.name}</p>
        )}
        <p className="text-xs text-stone-500">
          {[formatDuration(track.durationSec), `Added by ${track.createdBy}`, track.createdAt && addedOn.format(new Date(track.createdAt))].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-stone-600">{inUse ? `Used by: ${usedBy.join(", ")}` : "Not used yet"}</p>
        {inUse && <p className="text-xs text-stone-500">{usedByMessage(usedBy.length)}</p>}
      </div>
      <PlayButton src={mediaUrl(track.key)} label={track.name} />
      {editing ? (
        <>
          <button type="button" disabled={busy} onClick={rename} className={small}>
            Save name
          </button>
          <button type="button" onClick={() => (setEditing(false), setName(track.name))} className={small}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" aria-label={`Rename ${track.name}`} onClick={() => setEditing(true)} className={small}>
          Rename
        </button>
      )}
      <button type="button" aria-label={`Delete ${track.name}`} disabled={inUse || busy} onClick={remove} className={small}>
        Delete
      </button>
    </li>
  );
}

export default function MusicLibrary({ tracks, usage, createAction, renameAction, deleteAction }) {
  const [notice, setNotice] = useState(null);
  return (
    <div className="mt-6 space-y-6">
      <AddTrack createAction={createAction} onResult={setNotice} />
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`text-sm ${notice.ok ? "text-green-700" : "text-red-700"}`}>
          {notice.message}
        </p>
      )}
      {tracks.length === 0 ? (
        <p className="text-sm text-stone-600">No songs yet. Add the first one above.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-4">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} usedBy={usage[track.id] ?? []} renameAction={renameAction} deleteAction={deleteAction} onResult={setNotice} />
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add the page**

`src/app/(admin)/admin/(staff)/music/page.js`:

```js
import { requireStaff } from "@/AdminModule/auth/server";
import { listInvitations } from "@/AdminModule/invitations/data";
import { createMusicTrackAction, deleteMusicTrackAction, renameMusicTrackAction } from "@/AdminModule/music/actions";
import { listMusicTracks } from "@/AdminModule/music/data";
import { usageByTrack } from "@/AdminModule/music/library";
import MusicLibrary from "@/AdminModule/music/MusicLibrary";

export const metadata = { title: "Music · Baba Saab Admin" };

export default async function MusicPage() {
  await requireStaff();
  let tracks = null;
  let usage = {};
  try {
    const [allTracks, invitations] = await Promise.all([listMusicTracks(), listInvitations()]);
    tracks = allTracks;
    usage = usageByTrack(invitations);
  } catch (err) {
    console.error("Music Library failed to load", err);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Music Library</h1>
      <p className="mt-1 text-stone-600">Songs every invitation can use as background music.</p>
      {tracks ? (
        <MusicLibrary tracks={tracks} usage={usage} createAction={createMusicTrackAction} renameAction={renameMusicTrackAction} deleteAction={deleteMusicTrackAction} />
      ) : (
        <p role="alert" className="mt-6 text-sm text-red-700">
          Couldn&apos;t load the Music Library. Refresh the page to try again.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/music src/AdminModule/AdminShell.test.jsx src/AdminModule/editor`
Expected: PASS.

- [ ] **Step 7: Update the staff guide**

`docs/admin-guide.md`:
- In the "What you can do right now" table, add this row after **Templates**:

```markdown
| **Music** | The shared Music Library: songs any invitation can use as background music. |
```

- Insert this section directly after the `## Editor step 8: Review` section:

```markdown
## Music Library

Open **Music** in the left menu to see the songs every invitation can use.

**Adding a song:** click **Choose MP3** and pick an MP3 file (up to 10 MB). The name fills in from the file name; change it if you like. Then click **Upload song**. Only upload music you have the rights to use.

**Listening:** press **▶ Play** next to a song.

**Renaming:** click **Rename**, type the new name and click **Save name**.

**Deleting:** click **Delete**. A song that any invitation uses can't be deleted. The page shows which invitations use it, so you can change their music first.
```

- [ ] **Step 8: Run all tests, build and commit**

```bash
npm test
npx next build
git add src/AdminModule/music src/AdminModule/editor/media/MusicPicker.jsx src/AdminModule/AdminShell.jsx src/AdminModule/AdminShell.test.jsx "src/app/(admin)/admin/(staff)/music" docs/admin-guide.md
git commit -m "feat(admin): add the Music Library page"
```

Expected: tests pass; the build lists `/admin/music`.

---

### Task 7: Verify on the sandbox and a preview branch, then hand off

**Files:** none created. This task proves the phase against real AWS and a real browser.

**Interfaces:**
- Consumes: everything above. The sandbox from Task 2 must be deployed, with the real `amplify_outputs.json`.
- Produces: a green suite, a clean build, real-AWS checks, a manual QA record, and a pushed branch with a preview deploy (with owner approval).

- [ ] **Step 1: Full test run, type check, build**

```bash
npm test
npx tsc --noEmit -p amplify/tsconfig.json
rm -rf .next && npx next build
```

Expected: everything passes. The build lists `/admin/music`, and `next.config.js` resolves the media host (see Task 2 Step 8).

- [ ] **Step 2: Re-deploy the sandbox and repeat the public-read checks**

```bash
npx ampx sandbox --once
```

Then repeat Task 2 Step 7's `probe.txt` checks. Expected:
- `public get: 200`
- `public list: 403`
- `outside folders: 403`

- [ ] **Step 3: Lockfile check**

```bash
D="$(mktemp -d)"; cp package.json package-lock.json "$D/"; (cd "$D" && npm ci --ignore-scripts --no-audit --no-fund 2>&1 | grep -E "EUSAGE|Invalid|Missing|added"); rm -rf "$D"
```

Expected: `added … packages` with no errors. If it fails, run `npm install --package-lock-only`, commit the lockfile, and recheck.

- [ ] **Step 4: Push and deploy a preview branch (owner approval needed)**

Ask the owner before pushing. Once approved:

```bash
git push -u origin feature/invitations-phase-2b
```

The owner connects `feature/invitations-phase-2b` in the Amplify console (**Add branch → Save and deploy**). When its backend stack reaches `CREATE_COMPLETE`, create a login for that branch:

```bash
npx ampx generate outputs --app-id d30b6bo32f9anu --branch feature/invitations-phase-2b --out-dir .amplify/phase2b
npm run admin:create -- himanisharma116@gmail.com --outputs .amplify/phase2b/amplify_outputs.json
```

- [ ] **Step 5: Manual QA with the owner on the preview URL**

`https://feature-invitations-phase-2b.d30b6bo32f9anu.amplifyapp.com/admin/login`. Record each result:

- [ ] **Cover:** upload a JPG cover. A progress bar shows, then the thumbnail. The phone preview shows the cover.
- [ ] **iPhone photo:** upload a `.heic` file. It converts and uploads, and the thumbnail is upright.
- [ ] **Couple photos:** bride and groom photos show in "The couple" section of the preview.
- [ ] **Gallery:**
  - Pick 5 photos at once. All 5 arrive, in a stable order.
  - Add captions, reorder and remove one.
  - Try to add 10 more: it stops at 12 and says how many weren't added.
- [ ] **Reload:** everything is still there after F5.
- [ ] **Public link:** copy a photo's URL from the preview (right-click → Copy image address) and open it in a private window. It loads.
- [ ] **Music Library:**
  - Add an MP3. It's listed with its length, and ▶ plays it.
  - Rename it.
  - Choose it in an invitation's step ⑤. The Music page now says "Used by: …", and Delete is disabled with the explanation.
- [ ] **One-off song:** upload an MP3 for one invitation only. ▶ plays it. The preview's music button plays after the reveal.
- [ ] **Deleting files:** remove the cover and wait for **Saved**. The old image URL now fails (403 or 404) in a private window.
- [ ] **Leaving mid-upload:** start uploading a large photo and click "All invitations". The page asks before leaving.
- [ ] **Phone width:** step ⑤ is usable at 360px width.

Fix anything that fails (with a test where the fault is in tested code) before handing off.

- [ ] **Step 6: Hand off**

Report the results and the preview URL to the owner. Merging `feature/invitations-phase-2b` into `main` deploys the bucket and the `MusicTrack` table to production. After merging, the owner deletes the preview branch in Amplify.
