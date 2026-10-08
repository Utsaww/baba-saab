# Digital Invitations — Phase 2a (Editor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff create an invitation from a template, fill in every text detail in an 8-step editor with a live phone preview and conflict-safe auto-save, and see what's still missing before publishing.

**Architecture:**
- **Storage:** one Amplify Data model, `Invitation`. It has a few derived columns for listing and search, plus the whole invitation as JSON (`content`). The existing zod schema validates `content` and stays the single source of truth.
- **Writes:** `admin` users may only create and read the model. Every change goes through `saveInvitation`, an AppSync JavaScript resolver that does a version-conditional DynamoDB update.
- **Rules:** pure functions in `src/InvitationModule` hold the domain rules: draft cleaning, the publish checklist, index fields and the preview fallback.
- **Server:** staff-only server actions in `src/AdminModule/invitations`.
- **Client:** the editor in `src/AdminModule/editor`. Step components edit one `content` object through `update(path, value)`. One reducer drives auto-save. A same-origin iframe renders the live preview with the real `InvitationRenderer`.

**Tech Stack:** Next.js 14.2 App Router (JavaScript), Amplify Gen 2 Data (DynamoDB, AppSync JS resolvers, `@aws-appsync/utils`), `aws-amplify` 6 / `@aws-amplify/adapter-nextjs`, zod 3, Tailwind, Vitest 2 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-08-invitations-phase-2a-editor-design.md` (binding), which settles Phase 2a decisions for the parent spec `docs/superpowers/specs/2026-10-06-digital-invitations-design.md` (§4 data model, §8 editor, §10 security).

## Global Constraints

- **Branch and git:**
  - Work on branch `feature/invitations-phase-2a`.
  - Never commit to `main`. Do not push or merge without the owner's approval.
  - End every commit message with a blank line, then `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Languages and code layout:**
  - `src/` is JavaScript only, and `amplify/` is TypeScript. AppSync JS resolvers are `.js` files in `amplify/data/`.
  - Nothing in `src/` imports from `amplify/`.
  - Import alias `@/*` → `src/*`.
  - `zod` stays **3.x**.
- **Invitation data:**
  - The zod `invitationSchema` in `src/InvitationModule/schema/invitation.js` is the single source of truth for invitation content.
  - `Invitation.content` is always stored as the **cleaned draft** (output of `cleanDraft`), serialised with `JSON.stringify`.
  - The derived fields `templateId`, `mainDate`, `coupleNames` and `searchText` are always computed by `indexFields(draft)`, never by hand.
  - All dates are `YYYY-MM-DD` and times `HH:mm`, in IST (`Asia/Kolkata`).
  - Localised text is `{ en?: string, hi?: string }`, and `language` is `en | hi | both`.
- **Access control:**
  - Every staff page, layout and server action calls `requireStaff()` (`src/AdminModule/auth/server.js`).
  - The `Invitation` model grants **only** `create` and `read`, and **only** to the `admin` group.
  - `saveInvitation` is `admin`-group only and rejects a stale `expectedVersion` with errorType `VersionConflict`.
- **Errors:** user-facing messages are plain sentences that say what to do next. Raw AWS errors are logged with `console.error` on the server and never shown.
- **Unchanged behaviour:**
  - Changing the template keeps all content.
  - Changing the language never deletes text already entered in the other language.
- **Tests and environment:**
  - Unit tests never import `amplify_outputs.json` or call AWS.
  - `amplify_outputs.json` (git-ignored) at the repo root is the real sandbox output. Never commit it.
- **Staff guide:** every staff-facing change updates `docs/admin-guide.md` in the same task, in plain language for non-technical staff.
- **UI:**
  - Touch targets ≥ 44px (`min-h-[44px]`).
  - Animations respect `prefers-reduced-motion`.
  - Admin pages are `noindex` (inherited).
- **Out of scope for 2a:**
  - Uploads and the Music Library (2b).
  - Slug, publish and public link (Phase 3).
  - Archive settings, delete and purge (Phase 5).

## Review Focus

1. **Two people editing the same invitation.** The second save must be rejected with a version conflict, and nothing is silently overwritten. Auto-save then pauses and shows "Updated by someone else — reload". Pinned in Task 2 (resolver `condition`), Task 3 (`saveResult` conflict mapping) and Task 9 (reducer `conflict` tests).
2. **A field with a bad value** (time `25:00`, a Maps link without `https://`, date `2026-02-31`). It must not block the rest of the invitation from saving: the bad field is dropped and its hint shows. Pinned in Task 1 (`cleanDraft` tests) and Task 6 (`VenueStep` hint test).
3. **Switching language from Both to English and back.** Hindi text must survive. Pinned in Task 6 (`LocalisedInput` and `TemplateStep` tests).
4. **A brand-new draft with only template, palette and language.** It must preview without crashing, with the "Sample details shown" banner. Hindi-only and half-filled drafts must also preview. Pinned in Task 1 (`previewInvitation` tests) and Task 10 (`PreviewFrameClient` test).
5. **Typing while a save is in flight.** The new change must be saved next, never lost. A failed save keeps the data and blocks leaving the page. Pinned in Task 9 (reducer `queued` tests and `useAutosave` hook tests).

---

## File Structure

```
amplify/data/resource.ts                    (modify) Invitation model + saveInvitation mutation
amplify/data/saveInvitation.js              AppSync JS resolver: version-conditional update
amplify/data/saveInvitation.test.ts         resolver tests (mocked @aws-appsync/utils)

src/InvitationModule/
  schema/draft.js            draftSchema, cleanDraft, pathKey
  schema/draft.test.js
  lib/checklist.js           requiredLanguages, stepForPath, publishChecklist
  lib/checklist.test.js
  lib/indexFields.js         indexFields(draft)
  lib/indexFields.test.js
  lib/preview.js             previewInvitation(draft, template)
  lib/preview.test.js
  lib/sections.js            (modify) orderedSectionIds extracted from visibleSections
  templates/base/TemplateFrame.jsx   (modify) ctx.skipOpening
  templates/base/TemplateFrame.test.jsx

src/AdminModule/
  dataClient.js              (moved from staff/dataClient.js)
  ui.js                      chipClass (shared chip style)
  guideAnchors.js            slugify for /admin/help#anchors
  guideAnchors.test.js
  AdminShell.jsx             (modify) Invitations nav item
  PhoneFrame.jsx             (modify) iframeRef / loading props
  TemplatePreview.jsx        (modify) uses chipClass
  invitations/
    templateChoices.js       serialisable template list for client components
    content.js               parseContent, prepareSave, saveResult, SAVE_FAILED
    content.test.js
    listing.js               filterInvitations, sortByRecent, formatEdited
    listing.test.js
    data.js                  listInvitations, getInvitation, createInvitationRecord, saveInvitationRecord (server)
    actions.js               "use server": createInvitationAction, saveInvitationAction
    InvitationList.jsx       list + search + status filter (client)
    InvitationList.test.jsx
    NewInvitationForm.jsx    template/palette/language picker (client)
    NewInvitationForm.test.jsx
  editor/
    paths.js                 getIn, setIn
    paths.test.js
    fields.jsx               Field, TextInput, LocalisedInput, Toggle, ChipGroup
    fields.test.jsx
    test-utils.jsx           renderStep helper (tests only)
    steps/TemplateStep.jsx   ①
    steps/CoupleStep.jsx     ②
    steps/VenueStep.jsx      ③
    steps/EventsStep.jsx     ④
    steps/MediaStep.jsx      ⑤
    steps/SectionsStep.jsx   ⑥
    steps/RsvpStep.jsx       ⑦
    steps/ReviewStep.jsx     ⑧
    steps/*.test.jsx
    steps/index.js           STEPS registry, stepHasContent
    steps/index.test.js
    autosave.js              saveReducer, initialSaveState, hasUnsavedChanges, statusLabel
    autosave.test.js
    useAutosave.js           debounce + save orchestration hook
    useAutosave.test.jsx
    useLeaveGuard.js         beforeunload + in-app link confirm; returns allowLeave()
    useLeaveGuard.test.jsx
    stepNumber.js            STEP_COUNT, stepNumber (server-safe)
    previewMessages.js       postMessage type constants
    SaveStatus.jsx           indicator + banners
    StepNav.jsx              step list with ✓
    EditorShell.jsx          the wizard
    EditorShell.test.jsx
    PreviewPane.jsx          iframe host + postMessage + EN/HI toggle
    PreviewPane.test.jsx
    PreviewFrameClient.jsx   renders the draft inside the iframe
    PreviewFrameClient.test.jsx

src/app/(admin)/admin/
  preview-frame/page.js                       staff-only, no shell
  (staff)/page.js                             (modify) Invitations card
  (staff)/help/page.js                        (modify) heading ids
  (staff)/invitations/page.js                 list
  (staff)/invitations/new/page.js             picker
  (staff)/invitations/[id]/edit/page.js       editor
  (staff)/invitations/[id]/edit/not-found.js
docs/admin-guide.md                           (modify) Invitations, Creating, Editor steps
```

---

### Task 1: Draft cleaning, publish checklist, index fields, preview fallback

**Files:**
- Create: `src/InvitationModule/schema/draft.js`, `src/InvitationModule/schema/draft.test.js`
- Create: `src/InvitationModule/lib/checklist.js`, `src/InvitationModule/lib/checklist.test.js`
- Create: `src/InvitationModule/lib/indexFields.js`, `src/InvitationModule/lib/indexFields.test.js`
- Create: `src/InvitationModule/lib/preview.js`, `src/InvitationModule/lib/preview.test.js`

**Interfaces:**
- Consumes:
  - `invitationSchema`, `TEMPLATE_IDS` (schema/invitation.js)
  - `textFor`, `hasText` (lib/i18n.js)
  - `getTemplate` (templates/registry.js, tests only)
- Produces:
  - `draftSchema`: zod schema with every field optional.
  - `pathKey(path: (string|number)[]) → string`, e.g. `["events",0,"time"]` → `"events.0.time"`.
  - `cleanDraft(input) → { draft: object | null, errors: Record<string,string> }`.
    - `draft` is null when the template or palette is missing or invalid.
    - `errors` maps the `pathKey` of each dropped field to its message.
  - `requiredLanguages(language) → ("en"|"hi")[]`
  - `stepForPath(path) → number` (1–8)
  - `publishChecklist(draft) → { id: string, message: string, step: number }[]`. An empty list means ready to publish.
  - `indexFields(draft) → { templateId, mainDate: string|null, coupleNames: string, searchText: string }`
  - `previewInvitation(draft, template) → { invitation, usedSample: boolean }`, where `invitation` has been parsed by `invitationSchema`.

- [ ] **Step 1: Write the failing tests**

`src/InvitationModule/schema/draft.test.js`:

```js
import { describe, expect, it } from "vitest";
import { cleanDraft, pathKey } from "./draft";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("pathKey", () => {
  it("joins a zod path", () => {
    expect(pathKey(["events", 0, "time"])).toBe("events.0.time");
  });
});

describe("cleanDraft", () => {
  it("keeps a brand-new draft with only template, palette and language", () => {
    expect(cleanDraft(base())).toEqual({ draft: base(), errors: {} });
  });

  it("returns no draft without a valid template or palette", () => {
    expect(cleanDraft({ theme: { palette: "x" } }).draft).toBeNull();
    expect(cleanDraft({ templateId: "neon", theme: { palette: "x" } }).draft).toBeNull();
    expect(cleanDraft({ templateId: "royal", theme: {} }).draft).toBeNull();
    expect(cleanDraft(null).draft).toBeNull();
  });

  it("drops a bad event time but keeps the rest of the event and the draft", () => {
    const input = {
      ...base(),
      couple: { bride: { name: { en: "Priya" } } },
      events: [{ id: "e1", name: { en: "Sangeet" }, date: "2027-02-13", time: "25:00" }],
    };
    const { draft, errors } = cleanDraft(input);
    expect(draft.events).toEqual([{ id: "e1", name: { en: "Sangeet" }, date: "2027-02-13" }]);
    expect(draft.couple.bride.name).toEqual({ en: "Priya" });
    expect(errors).toEqual({ "events.0.time": "Use HH:mm (24-hour)" });
  });

  it("drops a Maps link that isn't a full URL", () => {
    const { draft, errors } = cleanDraft({ ...base(), venue: { name: { en: "Riviera" }, mapsUrl: "maps.google.com" } });
    expect(draft.venue).toEqual({ name: { en: "Riviera" } });
    expect(Object.keys(errors)).toEqual(["venue.mapsUrl"]);
  });

  it("drops an impossible date", () => {
    const { draft, errors } = cleanDraft({ ...base(), mainDate: "2026-02-31" });
    expect(draft.mainDate).toBeUndefined();
    expect(errors.mainDate).toBe("Enter a real date");
  });

  it("drops unknown section ids", () => {
    const { draft } = cleanDraft({ ...base(), theme: { palette: "maroon-gold", sectionOrder: ["venue", "bogus", "couple"] } });
    expect(draft.theme.sectionOrder).toEqual(["venue", "couple"]);
  });

  it("trims localised text and does not mutate the input", () => {
    const input = { ...base(), couple: { groom: { name: { en: "  Rahul " } } } };
    const { draft } = cleanDraft(input);
    expect(draft.couple.groom.name.en).toBe("Rahul");
    expect(input.couple.groom.name.en).toBe("  Rahul ");
  });
});
```

`src/InvitationModule/lib/checklist.test.js`:

```js
import { describe, expect, it } from "vitest";
import { publishChecklist, requiredLanguages, stepForPath } from "./checklist";

const complete = () => ({
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Riviera Resort" }, address: { en: "MG Road, Jaipur" } },
  events: [{ id: "e1", name: { en: "Sangeet" }, date: "2027-02-13", time: "19:30" }],
});

describe("requiredLanguages", () => {
  it("follows the invitation language", () => {
    expect(requiredLanguages("en")).toEqual(["en"]);
    expect(requiredLanguages("hi")).toEqual(["hi"]);
    expect(requiredLanguages("both")).toEqual(["en", "hi"]);
    expect(requiredLanguages(undefined)).toEqual(["en"]);
  });
});

describe("stepForPath", () => {
  it("maps fields to the editor step that fixes them", () => {
    expect(stepForPath(["theme", "palette"])).toBe(1);
    expect(stepForPath(["couple", "bride", "name"])).toBe(2);
    expect(stepForPath(["venue", "mapsUrl"])).toBe(3);
    expect(stepForPath(["events", 0, "date"])).toBe(4);
    expect(stepForPath(["media", "film"])).toBe(5);
    expect(stepForPath(["theme", "hidden"])).toBe(6);
    expect(stepForPath(["rsvp", "deadline"])).toBe(7);
  });
});

describe("publishChecklist", () => {
  it("is empty for a complete invitation", () => {
    expect(publishChecklist(complete())).toEqual([]);
  });

  it("lists everything a brand-new draft is missing, with the step that fixes it", () => {
    const items = publishChecklist({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });
    expect(items.map((i) => [i.message, i.step])).toEqual([
      ["Add the bride's name", 2],
      ["Add the groom's name", 2],
      ["Add the wedding date", 3],
      ["Add the venue name", 3],
      ["Add the venue address", 3],
    ]);
  });

  it("asks for both languages when the invitation is in both", () => {
    const messages = publishChecklist({ ...complete(), language: "both" }).map((i) => i.message);
    expect(messages).toContain("Add the bride's name in Hindi");
    expect(messages).toContain("Add the venue address in Hindi");
    expect(messages).not.toContain("Add the bride's name in English");
  });

  it("names the event that needs a time or date", () => {
    const draft = complete();
    draft.events = [{ id: "e1", name: { en: "Sangeet" } }];
    expect(publishChecklist(draft)).toEqual([
      { id: "event0.date", message: "Add a date for Sangeet", step: 4 },
      { id: "event0.time", message: "Add a time for Sangeet", step: 4 },
    ]);
  });

  it("calls an unnamed event by its number", () => {
    const draft = complete();
    draft.events = [{ id: "e1", date: "2027-02-13", time: "10:00" }];
    expect(publishChecklist(draft).map((i) => i.message)).toEqual(["Add a name for event 1"]);
  });
});
```

`src/InvitationModule/lib/indexFields.test.js`:

```js
import { describe, expect, it } from "vitest";
import { indexFields } from "./indexFields";

describe("indexFields", () => {
  it("builds the list label and search text", () => {
    const fields = indexFields({
      templateId: "floral",
      mainDate: "2027-02-14",
      couple: { bride: { name: { en: "Priya ", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
      hosts: { contactPhone: "+91 98765-43210" },
    });
    expect(fields).toEqual({
      templateId: "floral",
      mainDate: "2027-02-14",
      coupleNames: "Priya & Rahul",
      searchText: "priya प्रिया rahul राहुल 919876543210",
    });
  });

  it("uses Hindi names when there is no English", () => {
    const fields = indexFields({ templateId: "royal", couple: { bride: { name: { hi: "प्रिया" } } } });
    expect(fields.coupleNames).toBe("प्रिया");
  });

  it("labels an invitation with no names yet", () => {
    expect(indexFields({ templateId: "royal" })).toEqual({
      templateId: "royal",
      mainDate: null,
      coupleNames: "Untitled invitation",
      searchText: "",
    });
  });
});
```

`src/InvitationModule/lib/preview.test.js`:

```js
import { describe, expect, it } from "vitest";
import { previewInvitation } from "./preview";
import { getTemplate } from "../templates/registry";

const royal = getTemplate("royal");

describe("previewInvitation", () => {
  it("fills a brand-new draft from the template sample and says so", () => {
    const { invitation, usedSample } = previewInvitation(
      { templateId: "royal", theme: { palette: "maroon-gold" }, language: "hi" },
      royal,
    );
    expect(usedSample).toBe(true);
    expect(invitation.couple.bride.name).toEqual(royal.sample.couple.bride.name);
    expect(invitation.mainDate).toBe(royal.sample.mainDate);
    expect(invitation.language).toBe("hi");
    expect(invitation.events).toEqual([]);
  });

  it("uses the draft's own details when they are filled in", () => {
    const { invitation, usedSample } = previewInvitation(
      {
        templateId: "royal",
        theme: { palette: "maroon-gold", hidden: ["travel"] },
        couple: { bride: { name: { hi: "प्रिया" } }, groom: { name: { hi: "राहुल" } } },
        mainDate: "2027-02-14",
        venue: { name: { hi: "रिवेरा" } },
      },
      royal,
    );
    expect(usedSample).toBe(false);
    expect(invitation.couple.bride.name).toEqual({ hi: "प्रिया" });
    expect(invitation.theme.hidden).toEqual(["travel"]);
  });

  it("leaves out events that have no date yet", () => {
    const { invitation } = previewInvitation(
      {
        templateId: "royal",
        theme: { palette: "maroon-gold" },
        events: [
          { id: "a", name: { en: "Haldi" } },
          { id: "b", name: { en: "Sangeet" }, date: "2027-02-13" },
        ],
      },
      royal,
    );
    expect(invitation.events.map((e) => e.id)).toEqual(["b"]);
  });

  it("falls back to the full sample if the draft still can't be rendered", () => {
    const { invitation, usedSample } = previewInvitation(
      { templateId: "royal", theme: { palette: "maroon-gold" }, hosts: { families: "not a list" } },
      royal,
    );
    expect(usedSample).toBe(true);
    expect(invitation.couple.groom.name).toEqual(royal.sample.couple.groom.name);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/InvitationModule/schema/draft.test.js src/InvitationModule/lib/checklist.test.js src/InvitationModule/lib/indexFields.test.js src/InvitationModule/lib/preview.test.js`
Expected: FAIL. `./draft`, `./checklist`, `./indexFields` and `./preview` can't be resolved.

- [ ] **Step 3: Implement draft cleaning**

`src/InvitationModule/schema/draft.js`:

```js
import { TEMPLATE_IDS, invitationSchema } from "./invitation";

// Every field optional, so a half-finished invitation always saves.
export const draftSchema = invitationSchema.deepPartial();

export const pathKey = (path) => path.join(".");

function withoutPath(value, path) {
  const [head, ...rest] = path;
  if (Array.isArray(value)) {
    const copy = [...value];
    if (rest.length === 0) copy.splice(head, 1);
    else copy[head] = withoutPath(copy[head], rest);
    return copy;
  }
  if (value && typeof value === "object") {
    const copy = { ...value };
    if (rest.length === 0) delete copy[head];
    else copy[head] = withoutPath(copy[head], rest);
    return copy;
  }
  return value;
}

// Each pass removes one offending field; a real draft has far fewer bad fields than this.
const MAX_PASSES = 200;

/**
 * Validates a draft field by field. A value that breaks its own rule is dropped (saved as blank)
 * and reported in `errors`, so one bad field never blocks the rest of the save.
 * `draft` is null when the template or palette is missing: every save needs those.
 */
export function cleanDraft(input) {
  const errors = {};
  let value = input && typeof input === "object" ? input : {};
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const result = draftSchema.safeParse(value);
    if (result.success) {
      const draft = result.data;
      const valid = TEMPLATE_IDS.includes(draft.templateId) && Boolean(draft.theme?.palette);
      return { draft: valid ? draft : null, errors };
    }
    const issue = result.error.issues[0];
    if (issue.path.length === 0) return { draft: null, errors };
    const key = pathKey(issue.path);
    if (!(key in errors)) errors[key] = issue.message;
    value = withoutPath(value, issue.path);
  }
  return { draft: null, errors };
}
```

- [ ] **Step 4: Implement the publish checklist**

`src/InvitationModule/lib/checklist.js`:

```js
import { invitationSchema } from "../schema/invitation";
import { textFor } from "./i18n";

const LANGUAGE_NAMES = { en: "English", hi: "Hindi" };

export function requiredLanguages(language) {
  if (language === "both") return ["en", "hi"];
  return [language === "hi" ? "hi" : "en"];
}

const STEP_FOR_FIELD = {
  templateId: 1,
  language: 1,
  couple: 2,
  hosts: 2,
  invocation: 2,
  mainDate: 3,
  venue: 3,
  events: 4,
  media: 5,
  theme: 6,
  rsvp: 7,
  showCredit: 7,
};

export function stepForPath(path) {
  if (path[0] === "theme" && path[1] === "palette") return 1;
  return STEP_FOR_FIELD[path[0]] ?? 8;
}

const filled = (s) => typeof s === "string" && s.trim() !== "";

/** What still stops this draft being published, as plain sentences with the step that fixes each. */
export function publishChecklist(draft) {
  const items = [];
  const langs = requiredLanguages(draft.language);
  const both = langs.length > 1;
  const add = (id, message, step) => items.push({ id, message, step });
  const needText = (id, label, value, step) => {
    for (const lang of langs) {
      if (!filled(value?.[lang])) add(`${id}.${lang}`, both ? `Add ${label} in ${LANGUAGE_NAMES[lang]}` : `Add ${label}`, step);
    }
  };

  needText("bride", "the bride's name", draft.couple?.bride?.name, 2);
  needText("groom", "the groom's name", draft.couple?.groom?.name, 2);
  if (!draft.mainDate) add("mainDate", "Add the wedding date", 3);
  needText("venueName", "the venue name", draft.venue?.name, 3);
  needText("venueAddress", "the venue address", draft.venue?.address, 3);
  (draft.events ?? []).forEach((event, i) => {
    const name = textFor(event.name, langs[0]) || `event ${i + 1}`;
    needText(`event${i}.name`, `a name for event ${i + 1}`, event.name, 4);
    if (!event.date) add(`event${i}.date`, `Add a date for ${name}`, 4);
    if (!event.time) add(`event${i}.time`, `Add a time for ${name}`, 4);
  });

  // Anything the strict schema still rejects once the obvious gaps are filled.
  if (items.length === 0) {
    const result = invitationSchema.safeParse(draft);
    if (!result.success) {
      for (const issue of result.error.issues) {
        add(`schema.${issue.path.join(".")}`, `Check ${issue.path.join(" › ")}: ${issue.message}`, stepForPath(issue.path));
      }
    }
  }
  return items;
}
```

- [ ] **Step 5: Implement index fields**

`src/InvitationModule/lib/indexFields.js`:

```js
import { textFor } from "./i18n";

const clean = (s) => (typeof s === "string" ? s.trim() : "");

/** The searchable, listable columns stored next to an invitation's content. Always derived, never typed in. */
export function indexFields(draft) {
  const bride = draft.couple?.bride?.name;
  const groom = draft.couple?.groom?.name;
  const names = [textFor(bride, "en"), textFor(groom, "en")].filter(Boolean);
  const phoneDigits = clean(draft.hosts?.contactPhone).replace(/\D/g, "");
  const searchParts = [bride?.en, bride?.hi, groom?.en, groom?.hi].map(clean).filter(Boolean);
  if (phoneDigits) searchParts.push(phoneDigits);
  return {
    templateId: draft.templateId,
    mainDate: draft.mainDate ?? null,
    coupleNames: names.length ? names.join(" & ") : "Untitled invitation",
    searchText: searchParts.join(" ").toLowerCase(),
  };
}
```

- [ ] **Step 6: Implement the preview fallback**

`src/InvitationModule/lib/preview.js`:

```js
import { invitationSchema } from "../schema/invitation";
import { hasText } from "./i18n";

const hasValue = (s) => typeof s === "string" && s !== "";

/**
 * Turns a cleaned draft into something the template can render. Required values that are still
 * blank (names, wedding date, venue name) are borrowed from the template's sample, and
 * `usedSample` tells the editor to say so.
 */
export function previewInvitation(draft, template) {
  const sample = template.sample;
  const d = draft ?? {};
  let usedSample = false;
  const pick = (value, fallback, has = hasText) => {
    if (has(value)) return value;
    usedSample = true;
    return fallback;
  };

  const candidate = {
    ...d,
    templateId: template.id,
    theme: {
      palette: d.theme?.palette ?? sample.theme.palette,
      sectionOrder: d.theme?.sectionOrder,
      hidden: d.theme?.hidden,
    },
    couple: {
      bride: { ...d.couple?.bride, name: pick(d.couple?.bride?.name, sample.couple.bride.name) },
      groom: { ...d.couple?.groom, name: pick(d.couple?.groom?.name, sample.couple.groom.name) },
    },
    mainDate: pick(d.mainDate, sample.mainDate, hasValue),
    venue: { ...d.venue, name: pick(d.venue?.name, sample.venue.name), address: d.venue?.address ?? {} },
    events: (d.events ?? []).filter((e) => hasValue(e.id) && hasValue(e.date)).map((e) => ({ ...e, name: e.name ?? {} })),
  };

  const result = invitationSchema.safeParse(candidate);
  if (result.success) return { invitation: result.data, usedSample };
  const fallback = invitationSchema.parse({
    ...sample,
    theme: { ...sample.theme, palette: candidate.theme.palette },
    language: d.language ?? sample.language,
  });
  return { invitation: fallback, usedSample: true };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/InvitationModule/schema/draft.test.js src/InvitationModule/lib/checklist.test.js src/InvitationModule/lib/indexFields.test.js src/InvitationModule/lib/preview.test.js`
Expected: PASS (all 4 files).

If a `cleanDraft` test fails because zod's `deepPartial()` leaves a nested object required inside a `.default(...)` wrapper, fix it in `draft.js` only. Build `draftSchema` so every nested object is partial, and keep the tests unchanged. Note the fix in your report.

- [ ] **Step 8: Run all tests and commit**

```bash
npm test
git add src/InvitationModule/schema/draft.js src/InvitationModule/schema/draft.test.js src/InvitationModule/lib/checklist.js src/InvitationModule/lib/checklist.test.js src/InvitationModule/lib/indexFields.js src/InvitationModule/lib/indexFields.test.js src/InvitationModule/lib/preview.js src/InvitationModule/lib/preview.test.js
git commit -m "feat(invitations): add draft cleaning, publish checklist, index fields and preview fallback"
```

Expected: all tests pass before committing.

---


### Task 2: Invitation model and conflict-safe save (backend)

**Files:**
- Create: `amplify/data/saveInvitation.js`, `amplify/data/saveInvitation.test.ts`
- Modify: `amplify/data/resource.ts`, `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: the existing `amplify/data/resource.ts` schema (StaffMember and the staff operations), and the sandbox deploy (`npx ampx sandbox --once`). AWS access already works for this.
- Produces:
  - Model `Invitation { id, status, templateId, mainDate?, coupleNames, searchText, content (AWSJSON), version (Int), createdBy, updatedBy, createdAt, updatedAt }`. Only the `admin` group may `create` and `read`.
  - Mutation `saveInvitation(id: ID!, expectedVersion: Int!, content: AWSJSON!, templateId: String!, mainDate: String, coupleNames: String!, searchText: String!, updatedBy: String!): Invitation`.
    - `admin` only.
    - A stale `expectedVersion` gives an error with `errorType: "VersionConflict"`.
  - In the app: `client.models.Invitation.create/get/list` and `client.mutations.saveInvitation({...})`, each resolving to `{ data, errors }`.

- [ ] **Step 1: Install the AppSync resolver utilities (for tests and types)**

```bash
npm install --save-dev @aws-appsync/utils
```

- [ ] **Step 2: Write the failing resolver tests**

`amplify/data/saveInvitation.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@aws-appsync/utils", () => ({
  util: {
    time: { nowISO8601: () => "2026-10-08T10:00:00.000Z" },
    error: (message: string, type: string) => {
      throw Object.assign(new Error(message), { type });
    },
  },
}));

vi.mock("@aws-appsync/utils/dynamodb", () => ({
  update: (input: unknown) => ({ operation: "UpdateItem", input }),
  operations: { increment: (by: number) => ({ increment: by }) },
}));

import { request, response } from "./saveInvitation.js";

const args = {
  id: "inv-1",
  expectedVersion: 3,
  content: '{"templateId":"royal"}',
  templateId: "royal",
  coupleNames: "Priya & Rahul",
  searchText: "priya rahul",
  updatedBy: "staff@example.com",
};

describe("saveInvitation request", () => {
  it("updates only if the stored version still matches, and bumps it", () => {
    const req = request({ args } as any) as any;
    expect(req.input.key).toEqual({ id: "inv-1" });
    expect(req.input.condition).toEqual({ version: { eq: 3 } });
    expect(req.input.update).toEqual({
      content: '{"templateId":"royal"}',
      templateId: "royal",
      mainDate: null,
      coupleNames: "Priya & Rahul",
      searchText: "priya rahul",
      updatedBy: "staff@example.com",
      updatedAt: "2026-10-08T10:00:00.000Z",
      version: { increment: 1 },
    });
  });

  it("stores the wedding date when given", () => {
    const req = request({ args: { ...args, mainDate: "2027-02-14" } } as any) as any;
    expect(req.input.update.mainDate).toBe("2027-02-14");
  });
});

describe("saveInvitation response", () => {
  it("returns the updated invitation", () => {
    expect(response({ result: { id: "inv-1", version: 4 } } as any)).toEqual({ id: "inv-1", version: 4 });
  });

  it("turns a failed version check into a VersionConflict error", () => {
    expect(() => response({ error: { type: "DynamoDB:ConditionalCheckFailedException", message: "x" } } as any)).toThrow(
      expect.objectContaining({ message: "Updated by someone else — reload", type: "VersionConflict" }),
    );
  });

  it("passes other errors through", () => {
    expect(() =>
      response({ error: { type: "DynamoDB:ProvisionedThroughputExceededException", message: "slow down" } } as any),
    ).toThrow(expect.objectContaining({ message: "slow down", type: "DynamoDB:ProvisionedThroughputExceededException" }));
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run amplify/data/saveInvitation.test.ts`
Expected: FAIL. `./saveInvitation.js` can't be resolved.

- [ ] **Step 4: Implement the resolver**

`amplify/data/saveInvitation.js`:

```js
import { util } from "@aws-appsync/utils";
import * as ddb from "@aws-appsync/utils/dynamodb";

// Version-checked save: writes only if nobody else has saved since this editor loaded the invitation.
// An unknown id has no stored version, so it is reported as a conflict too.
export function request(ctx) {
  const { id, expectedVersion, content, templateId, mainDate, coupleNames, searchText, updatedBy } = ctx.args;
  return ddb.update({
    key: { id },
    update: {
      content,
      templateId,
      mainDate: mainDate ?? null,
      coupleNames,
      searchText,
      updatedBy,
      updatedAt: util.time.nowISO8601(),
      version: ddb.operations.increment(1),
    },
    condition: { version: { eq: expectedVersion } },
  });
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === "DynamoDB:ConditionalCheckFailedException") {
      util.error("Updated by someone else — reload", "VersionConflict");
    }
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

- [ ] **Step 5: Run the resolver tests to verify they pass**

Run: `npx vitest run amplify/data/saveInvitation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Add the model and mutation to the schema**

`amplify/data/resource.ts`: add these two entries inside `a.schema({ ... })`, after `removeStaff`. Leave the existing entries unchanged.

```ts
  Invitation: a
    .model({
      status: a.string().required(),
      templateId: a.string().required(),
      mainDate: a.string(),
      coupleNames: a.string().required(),
      searchText: a.string().required(),
      content: a.json().required(),
      version: a.integer().required(),
      createdBy: a.string().required(),
      updatedBy: a.string().required(),
    })
    // Staff can create and read; every change goes through saveInvitation's version check.
    .authorization((allow) => [allow.group("admin").to(["create", "read"])]),

  saveInvitation: a
    .mutation()
    .arguments({
      id: a.id().required(),
      expectedVersion: a.integer().required(),
      content: a.json().required(),
      templateId: a.string().required(),
      mainDate: a.string(),
      coupleNames: a.string().required(),
      searchText: a.string().required(),
      updatedBy: a.string().required(),
    })
    .returns(a.ref("Invitation"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.custom({ dataSource: a.ref("Invitation"), entry: "./saveInvitation.js" })),
```

- [ ] **Step 7: Type-check and deploy to the sandbox**

```bash
npx tsc --noEmit -p amplify/tsconfig.json
npx ampx sandbox --once
node -e "const o=require('./amplify_outputs.json');const mi=o.data.model_introspection;console.log(Object.keys(mi.models), Object.keys(mi.mutations))"
```

Expected:
- `tsc` passes.
- The deploy ends with `Deployment completed`.
- The last command prints `[ 'Invitation' ]` and a mutations list that includes `saveInvitation`, `inviteStaff` and `removeStaff`.

If synth rejects `allow.group("admin").to([...])` or `a.handler.custom({ dataSource: a.ref("Invitation") })`, read the installed definitions in `node_modules/@aws-amplify/data-schema/dist/esm/` (`Authorization.d.ts`, `Handler.d.ts`). Fix the call shape, keep the same permissions and behaviour, and record the change in your report.

- [ ] **Step 8: Run all tests and commit**

```bash
npm test
git add amplify/data/resource.ts amplify/data/saveInvitation.js amplify/data/saveInvitation.test.ts package.json package-lock.json
git commit -m "feat(backend): add Invitation model and version-checked saveInvitation"
```

Never stage `amplify_outputs.json`.

---

### Task 3: Server data layer and actions

**Files:**
- Move: `src/AdminModule/staff/dataClient.js` → `src/AdminModule/dataClient.js`
- Modify: `src/AdminModule/staff/actions.js`, `src/app/(admin)/admin/(staff)/staff/page.js` (import path only)
- Create: `src/AdminModule/invitations/content.js`, `src/AdminModule/invitations/content.test.js`
- Create: `src/AdminModule/invitations/listing.js`, `src/AdminModule/invitations/listing.test.js`
- Create: `src/AdminModule/invitations/data.js`, `src/AdminModule/invitations/actions.js`

**Interfaces:**
- Consumes:
  - `cleanDraft`, `indexFields` (Task 1)
  - `requireStaff() → { username, email, groups, isStaff, isOwner }`
  - `getTemplate` (registry), `LANGUAGES` (schema)
  - the Task 2 Data API
- Produces:
  - `content.js`:
    - `SAVE_FAILED` (string)
    - `parseContent(value) → object`
    - `prepareSave({ id, expectedVersion, content }) → { ok: true, content: string, fields } | { ok: false, message }`
    - `saveResult({ data, errors }) → { ok: true, version, savedAt } | { ok: false, conflict: true } | { ok: false, message }`
  - `listing.js`:
    - `filterInvitations(rows, { q?, status? }) → rows`
    - `sortByRecent(rows) → rows`
    - `formatEdited(iso, now: number) → string`
  - `data.js` (server only):
    - `listInvitations() → row[]`, with rows `{ id, status, templateId, mainDate, coupleNames, searchText, updatedAt, updatedBy }`
    - `getInvitation(id) → { id, version, updatedAt, content } | null`
    - `createInvitationRecord({ content, email }) → id`
    - `saveInvitationRecord({ id, expectedVersion, content, fields, email }) → { data, errors }`
  - `actions.js` (server actions):
    - `createInvitationAction({ templateId, palette, language })` redirects to `/admin/invitations/<id>/edit?step=2`, or returns `{ ok: false, message }`.
    - `saveInvitationAction({ id, expectedVersion, content })` returns a `saveResult` shape, or `{ ok: false, message }`.

- [ ] **Step 1: Move the shared data client**

```bash
git mv src/AdminModule/staff/dataClient.js src/AdminModule/dataClient.js
```

Then update two imports:
- In `src/AdminModule/staff/actions.js`, change `import { cookieDataClient } from "./dataClient";` to `import { cookieDataClient } from "@/AdminModule/dataClient";`.
- In `src/app/(admin)/admin/(staff)/staff/page.js`, change `@/AdminModule/staff/dataClient` to `@/AdminModule/dataClient`.

Run: `npm test`
Expected: all tests still pass.

- [ ] **Step 2: Write the failing tests**

`src/AdminModule/invitations/content.test.js`:

```js
import { describe, expect, it } from "vitest";
import { parseContent, prepareSave, SAVE_FAILED, saveResult } from "./content";

const content = {
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: " Priya " } } },
};

describe("parseContent", () => {
  it("accepts a JSON string or an object", () => {
    expect(parseContent('{"a":1}')).toEqual({ a: 1 });
    expect(parseContent({ a: 1 })).toEqual({ a: 1 });
    expect(parseContent(null)).toEqual({});
    expect(parseContent("not json")).toEqual({});
  });
});

describe("prepareSave", () => {
  it("cleans the draft and derives the index fields", () => {
    const result = prepareSave({ id: "inv-1", expectedVersion: 2, content });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.content).couple.bride.name.en).toBe("Priya");
    expect(result.fields).toEqual({ templateId: "royal", mainDate: null, coupleNames: "Priya", searchText: "priya" });
  });

  it("rejects a malformed request", () => {
    expect(prepareSave({ id: 5, expectedVersion: 2, content })).toEqual({
      ok: false,
      message: "That save request wasn't valid. Reload the page.",
    });
    expect(prepareSave({ id: "inv-1", expectedVersion: "2", content }).ok).toBe(false);
  });

  it("refuses to save without a template and palette", () => {
    expect(prepareSave({ id: "inv-1", expectedVersion: 1, content: { language: "en" } })).toEqual({
      ok: false,
      message: "Choose a template and palette before saving.",
    });
  });
});

describe("saveResult", () => {
  it("reports the new version and save time", () => {
    expect(saveResult({ data: { version: 3, updatedAt: "2026-10-08T10:00:00.000Z" } })).toEqual({
      ok: true,
      version: 3,
      savedAt: "2026-10-08T10:00:00.000Z",
    });
  });

  it("recognises a version conflict", () => {
    expect(saveResult({ errors: [{ errorType: "VersionConflict", message: "Updated by someone else — reload" }] })).toEqual({
      ok: false,
      conflict: true,
    });
  });

  it("hides any other error behind a plain message", () => {
    expect(saveResult({ errors: [{ errorType: "DynamoDB:Throttling", message: "arn:aws:..." }] })).toEqual({
      ok: false,
      message: SAVE_FAILED,
    });
    expect(saveResult({ data: null })).toEqual({ ok: false, message: SAVE_FAILED });
  });
});
```

`src/AdminModule/invitations/listing.test.js`:

```js
import { describe, expect, it } from "vitest";
import { filterInvitations, formatEdited, sortByRecent } from "./listing";

const rows = [
  { id: "a", status: "draft", searchText: "priya प्रिया rahul 919876543210", updatedAt: "2026-10-08T09:00:00.000Z" },
  { id: "b", status: "draft", searchText: "neha arjun", updatedAt: "2026-10-08T11:00:00.000Z" },
  { id: "c", status: "published", searchText: "aarohi vihaan", updatedAt: "2026-10-07T11:00:00.000Z" },
];

describe("filterInvitations", () => {
  it("returns everything with no search or filter", () => {
    expect(filterInvitations(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("matches every search word, in either language, ignoring case", () => {
    expect(filterInvitations(rows, { q: "PRIYA rahul" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterInvitations(rows, { q: "प्रिया" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterInvitations(rows, { q: "priya neha" })).toEqual([]);
  });

  it("matches phone numbers however they are typed", () => {
    expect(filterInvitations(rows, { q: "98765 43210" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterInvitations(rows, { q: "+91-98765" }).map((r) => r.id)).toEqual(["a"]);
  });

  it("filters by status", () => {
    expect(filterInvitations(rows, { status: "published" }).map((r) => r.id)).toEqual(["c"]);
  });
});

describe("sortByRecent", () => {
  it("puts the most recently edited first without mutating the input", () => {
    expect(sortByRecent(rows).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(rows[0].id).toBe("a");
  });
});

describe("formatEdited", () => {
  const now = Date.parse("2026-10-08T12:00:00.000Z");

  it("describes recent edits relatively", () => {
    expect(formatEdited("2026-10-08T11:59:40.000Z", now)).toBe("just now");
    expect(formatEdited("2026-10-08T11:45:00.000Z", now)).toBe("15 min ago");
    expect(formatEdited("2026-10-08T09:00:00.000Z", now)).toBe("3 h ago");
    expect(formatEdited("2026-10-05T12:00:00.000Z", now)).toBe("3 days ago");
  });

  it("shows older edits as a date in India time", () => {
    const expected = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date("2026-09-20T20:00:00.000Z"));
    expect(expected).toMatch(/^21 Sep/);
    expect(formatEdited("2026-09-20T20:00:00.000Z", now)).toBe(expected);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/invitations`
Expected: FAIL. `./content` and `./listing` can't be resolved.

- [ ] **Step 4: Implement the content helpers**

`src/AdminModule/invitations/content.js`:

```js
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { indexFields } from "@/InvitationModule/lib/indexFields";

export const SAVE_FAILED = "Couldn't save. Check your connection and try again.";

/** Amplify returns AWSJSON as a string; accept either form. */
export function parseContent(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function prepareSave({ id, expectedVersion, content }) {
  if (typeof id !== "string" || !id || !Number.isInteger(expectedVersion)) {
    return { ok: false, message: "That save request wasn't valid. Reload the page." };
  }
  const { draft } = cleanDraft(content);
  if (!draft) return { ok: false, message: "Choose a template and palette before saving." };
  return { ok: true, content: JSON.stringify(draft), fields: indexFields(draft) };
}

export function saveResult({ data, errors }) {
  if (errors?.length) {
    if (errors[0].errorType === "VersionConflict") return { ok: false, conflict: true };
    return { ok: false, message: SAVE_FAILED };
  }
  if (!data) return { ok: false, message: SAVE_FAILED };
  return { ok: true, version: data.version, savedAt: data.updatedAt };
}
```

- [ ] **Step 5: Implement the listing helpers**

`src/AdminModule/invitations/listing.js`:

```js
const digits = (s) => s.replace(/\D/g, "");

export function filterInvitations(rows, { q = "", status = "all" } = {}) {
  const query = q.trim().toLowerCase();
  const queryDigits = digits(query);
  // A query that is mostly a phone number is matched on digits alone, however it was typed.
  const phoneSearch = queryDigits.length >= 5 && queryDigits.length >= query.replace(/\s/g, "").length - 3;
  const terms = query.split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    const text = (row.searchText ?? "").toLowerCase();
    if (phoneSearch) return digits(text).includes(queryDigits);
    return terms.every((term) => text.includes(term));
  });
}

export function sortByRecent(rows) {
  return [...rows].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const olderDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatEdited(iso, now) {
  const elapsed = now - Date.parse(iso);
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} days ago`;
  return olderDate.format(new Date(iso));
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/invitations`
Expected: PASS (both files).

- [ ] **Step 7: Implement the server data functions and actions**

`src/AdminModule/invitations/data.js`:

```js
import { cookieDataClient } from "@/AdminModule/dataClient";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { parseContent } from "./content";

const LIST_FIELDS = ["id", "status", "templateId", "mainDate", "coupleNames", "searchText", "updatedAt", "updatedBy"];

function failIfErrors(errors) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
}

/** Every invitation's list columns (not its content). Fine for hundreds of rows. */
export async function listInvitations() {
  const client = cookieDataClient();
  const rows = [];
  let nextToken = null;
  do {
    const page = await client.models.Invitation.list({ selectionSet: LIST_FIELDS, limit: 100, nextToken });
    failIfErrors(page.errors);
    rows.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return rows;
}

export async function getInvitation(id) {
  const { data, errors } = await cookieDataClient().models.Invitation.get({ id });
  failIfErrors(errors);
  if (!data) return null;
  return { id: data.id, version: data.version, updatedAt: data.updatedAt, content: parseContent(data.content) };
}

export async function createInvitationRecord({ content, email }) {
  const { data, errors } = await cookieDataClient().models.Invitation.create({
    status: "draft",
    ...indexFields(content),
    content: JSON.stringify(content),
    version: 1,
    createdBy: email,
    updatedBy: email,
  });
  failIfErrors(errors);
  if (!data) throw new Error("Invitation.create returned no data");
  return data.id;
}

export function saveInvitationRecord({ id, expectedVersion, content, fields, email }) {
  return cookieDataClient().mutations.saveInvitation({ id, expectedVersion, content, ...fields, updatedBy: email });
}
```

`src/AdminModule/invitations/actions.js`:

```js
"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/AdminModule/auth/server";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { LANGUAGES } from "@/InvitationModule/schema/invitation";
import { getTemplate } from "@/InvitationModule/templates/registry";
import { createInvitationRecord, saveInvitationRecord } from "./data";
import { prepareSave, SAVE_FAILED, saveResult } from "./content";

export async function createInvitationAction({ templateId, palette, language }) {
  const session = await requireStaff();
  const template = getTemplate(templateId);
  const { draft } = cleanDraft({ templateId, theme: { palette }, language });
  if (!template || !template.palettes.some((p) => p.id === palette) || !LANGUAGES.includes(language) || !draft) {
    return { ok: false, message: "Choose a template, a palette and a language." };
  }

  let id;
  try {
    id = await createInvitationRecord({ content: draft, email: session.email });
  } catch (err) {
    console.error("createInvitation failed", err);
    return { ok: false, message: "Couldn't create the invitation. Please try again." };
  }
  // redirect() throws, so it stays outside the try.
  redirect(`/admin/invitations/${id}/edit?step=2`);
}

export async function saveInvitationAction({ id, expectedVersion, content }) {
  const session = await requireStaff();
  const prepared = prepareSave({ id, expectedVersion, content });
  if (!prepared.ok) return prepared;

  try {
    const { data, errors } = await saveInvitationRecord({
      id,
      expectedVersion,
      content: prepared.content,
      fields: prepared.fields,
      email: session.email,
    });
    const result = saveResult({ data, errors });
    if (!result.ok && !result.conflict) console.error("saveInvitation failed", errors);
    return result;
  } catch (err) {
    console.error("saveInvitation failed", err);
    return { ok: false, message: SAVE_FAILED };
  }
}
```

- [ ] **Step 8: Build, run all tests and commit**

```bash
npm test
npx next build
git add -A src/AdminModule/dataClient.js src/AdminModule/staff "src/app/(admin)/admin/(staff)/staff/page.js" src/AdminModule/invitations
git commit -m "feat(invitations): add server data layer and create/save actions"
```

Expected: tests pass and the build succeeds.

---


### Task 4: Invitations list, navigation and dashboard

**Files:**
- Create: `src/AdminModule/ui.js`, `src/AdminModule/invitations/InvitationList.jsx`, `src/AdminModule/invitations/InvitationList.test.jsx`, `src/app/(admin)/admin/(staff)/invitations/page.js`
- Modify: `src/AdminModule/AdminShell.jsx`, `src/AdminModule/AdminShell.test.jsx`, `src/AdminModule/TemplatePreview.jsx`, `src/app/(admin)/admin/(staff)/page.js`, `docs/admin-guide.md`

**Interfaces:**
- Consumes:
  - `listInvitations()`, `filterInvitations`, `sortByRecent`, `formatEdited` (Task 3)
  - `formatDate(date, lang)` (lib/datetime.js)
  - `TEMPLATES` (registry), `requireStaff`
- Produces:
  - `chipClass(active: boolean) → string`, the shared chip style.
  - `InvitationList({ rows, templateNames: Record<id,name>, now: number })`
  - The `/admin/invitations` page.
  - `navFor` now lists Dashboard, Invitations, Templates, [Staff], Help.

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/invitations/InvitationList.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvitationList from "./InvitationList";

const now = Date.parse("2026-10-08T12:00:00.000Z");
const rows = [
  { id: "a", status: "draft", templateId: "royal", mainDate: "2027-02-14", coupleNames: "Priya & Rahul", searchText: "priya rahul", updatedAt: "2026-10-08T09:00:00.000Z", updatedBy: "neha@example.com" },
  { id: "b", status: "draft", templateId: "floral", mainDate: null, coupleNames: "Untitled invitation", searchText: "", updatedAt: "2026-10-08T11:58:00.000Z", updatedBy: "amit@example.com" },
];
const templateNames = { royal: "Royal Rajasthani", floral: "Floral Pastel" };

describe("InvitationList", () => {
  it("lists invitations newest edit first, linking to the editor", () => {
    render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/invitations/b/edit", "/admin/invitations/a/edit"]);
    expect(within(links[1]).getByText("Royal Rajasthani")).toBeInTheDocument();
    expect(within(links[1]).getByText("Edited 3 h ago by neha@example.com")).toBeInTheDocument();
    expect(within(links[0]).getByText("No date yet")).toBeInTheDocument();
  });

  it("searches by name", async () => {
    render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search invitations" }), "priya");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search invitations" }), "zzz");
    expect(screen.getByText("No invitations match your search.")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "published");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("invites staff to create the first invitation", () => {
    render(<InvitationList rows={[]} templateNames={templateNames} now={now} />);
    expect(screen.getByText("No invitations yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New invitation" })).toHaveAttribute("href", "/admin/invitations/new");
  });
});
```

`src/AdminModule/AdminShell.test.jsx`: change the two `navFor` expectations to:

```jsx
    expect(navFor({ isOwner: true }).map((i) => i.label)).toEqual(["Dashboard", "Invitations", "Templates", "Staff", "Help"]);
    expect(navFor({ isOwner: false }).map((i) => i.label)).toEqual(["Dashboard", "Invitations", "Templates", "Help"]);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/invitations/InvitationList.test.jsx src/AdminModule/AdminShell.test.jsx`
Expected: FAIL. `./InvitationList` can't be resolved, and the nav labels don't match yet.

- [ ] **Step 3: Add the shared chip style and use it in the template preview**

`src/AdminModule/ui.js`:

```js
// Pill-shaped toggle button used for palettes, languages and similar choices.
export const chipClass = (active) =>
  `flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm ${
    active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"
  }`;
```

In `src/AdminModule/TemplatePreview.jsx`:
- Delete the local `const chip = (active) => ...;` definition.
- Add `import { chipClass } from "./ui";`.
- Replace both `className={chip(...)}` uses with `className={chipClass(...)}`.

- [ ] **Step 4: Implement the list**

`src/AdminModule/invitations/InvitationList.jsx`:

```jsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { filterInvitations, formatEdited, sortByRecent } from "./listing";

const STATUS_LABELS = { draft: "Draft", published: "Published", archived: "Archived" };

const newButtonClass = "inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white";

export default function InvitationList({ rows, templateNames, now }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const shown = useMemo(() => sortByRecent(filterInvitations(rows, { q, status })), [rows, q, status]);

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-stone-300 p-8 text-center">
        <p className="text-stone-600">No invitations yet.</p>
        <Link href="/admin/invitations/new" className={`mt-4 ${newButtonClass}`}>
          New invitation
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          aria-label="Search invitations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by couple name or phone"
          className="min-h-[44px] min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm"
        />
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-h-[44px] rounded-md border border-stone-300 bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-stone-600">No invitations match your search.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {shown.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/invitations/${row.id}/edit`}
                className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-stone-50"
              >
                <span className="min-w-0 flex-1 font-medium">{row.coupleNames}</span>
                <span className="text-sm text-stone-600">{templateNames[row.templateId] ?? row.templateId}</span>
                <span className="text-sm text-stone-600">{row.mainDate ? formatDate(row.mainDate) : "No date yet"}</span>
                <span className="rounded-full bg-stone-100 px-2 text-xs">{STATUS_LABELS[row.status] ?? row.status}</span>
                <span className="w-full text-xs text-stone-500">
                  {`Edited ${formatEdited(row.updatedAt, now)}${row.updatedBy ? ` by ${row.updatedBy}` : ""}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add the page, the nav item and the dashboard card**

`src/app/(admin)/admin/(staff)/invitations/page.js`:

```js
import Link from "next/link";
import { requireStaff } from "@/AdminModule/auth/server";
import { listInvitations } from "@/AdminModule/invitations/data";
import InvitationList from "@/AdminModule/invitations/InvitationList";
import { TEMPLATES } from "@/InvitationModule/templates/registry";

export const metadata = { title: "Invitations · Baba Saab Admin" };

export default async function InvitationsPage() {
  await requireStaff();
  let rows = null;
  try {
    rows = await listInvitations();
  } catch (err) {
    console.error("listInvitations failed", err);
  }
  const templateNames = Object.fromEntries(TEMPLATES.map((t) => [t.id, t.name]));

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <Link href="/admin/invitations/new" className="inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white">
          New invitation
        </Link>
      </div>
      {rows ? (
        <InvitationList rows={rows} templateNames={templateNames} now={Date.now()} />
      ) : (
        <p role="alert" className="mt-6 text-sm text-red-700">
          Couldn&apos;t load invitations. Refresh the page to try again.
        </p>
      )}
    </div>
  );
}
```

`src/AdminModule/AdminShell.jsx`:
- In `navFor`, add `{ href: "/admin/invitations", label: "Invitations" },` right after the Dashboard entry.
- Delete the `<span ...>Invitations · coming soon</span>` element.

`src/app/(admin)/admin/(staff)/page.js`:
- Add `{ href: "/admin/invitations", title: "Invitations", text: "Create invitations and continue drafts." },` as the first entry in `cards`.
- Change the "Coming soon" paragraph's text to: `Coming soon: upcoming events, recent RSVPs and invitations due for deletion will appear here.`

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/invitations/InvitationList.test.jsx src/AdminModule/AdminShell.test.jsx`
Expected: PASS.

- [ ] **Step 7: Update the staff guide**

`docs/admin-guide.md`:
- In the "What you can do right now" table, add this row directly after the **Dashboard** row:

```markdown
| **Invitations** | Create invitations for customers, fill in their details and continue saved drafts. |
```

- Insert this section directly before `## Browsing templates`:

```markdown
## Invitations

Open **Invitations** in the left menu to see every invitation, with the most recently edited at the top. Each row shows the couple's names, the design, the wedding date, its status and who edited it last.

- **Search:** type part of a name (English or Hindi) or a phone number.
- **Status:** choose a status to see only those invitations. New invitations are **Draft** until they are published.
- Click a row to open it in the editor.
```

- [ ] **Step 8: Run all tests, build and commit**

```bash
npm test
npx next build
git add src/AdminModule/ui.js src/AdminModule/TemplatePreview.jsx src/AdminModule/AdminShell.jsx src/AdminModule/AdminShell.test.jsx src/AdminModule/invitations/InvitationList.jsx src/AdminModule/invitations/InvitationList.test.jsx "src/app/(admin)/admin/(staff)/invitations/page.js" "src/app/(admin)/admin/(staff)/page.js" docs/admin-guide.md
git commit -m "feat(admin): add Invitations list with search and status filter"
```

Expected: tests pass; the build lists `/admin/invitations`.

---

### Task 5: New invitation picker

**Files:**
- Create: `src/AdminModule/invitations/templateChoices.js`, `src/AdminModule/invitations/NewInvitationForm.jsx`, `src/AdminModule/invitations/NewInvitationForm.test.jsx`, `src/app/(admin)/admin/(staff)/invitations/new/page.js`
- Modify: `docs/admin-guide.md`

**Interfaces:**
- Consumes:
  - `createInvitationAction` (Task 3)
  - `chipClass` (Task 4)
  - `PhoneFrame({ src, title, scale })`
  - `TEMPLATES`, `requireStaff`
- Produces:
  - `templateChoices() → { id, name, description, palettes: { id, name, bg, primary }[] }[]`. It is the serialisable template list for client components, and Task 9 reuses it.
  - `NewInvitationForm({ templates, createAction })`, where `templates` is the shape `templateChoices()` returns.
  - The `/admin/invitations/new` page.

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/invitations/NewInvitationForm.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewInvitationForm from "./NewInvitationForm";

const templates = [
  { id: "royal", name: "Royal Rajasthani", description: "Maroon and gold.", palettes: [{ id: "maroon-gold", name: "Maroon & Gold", bg: "#fff", primary: "#800" }, { id: "ivory", name: "Ivory", bg: "#ffe", primary: "#a80" }] },
  { id: "floral", name: "Floral Pastel", description: "Soft florals.", palettes: [{ id: "blush", name: "Blush", bg: "#fee", primary: "#c88" }] },
];

describe("NewInvitationForm", () => {
  it("creates with the first template, palette and English by default", async () => {
    const createAction = vi.fn(() => new Promise(() => {}));
    render(<NewInvitationForm templates={templates} createAction={createAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(createAction).toHaveBeenCalledWith({ templateId: "royal", palette: "maroon-gold", language: "en" });
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });

  it("switches to the new template's first palette when the template changes", async () => {
    const createAction = vi.fn(() => new Promise(() => {}));
    render(<NewInvitationForm templates={templates} createAction={createAction} />);
    await userEvent.click(screen.getByRole("button", { name: /Floral Pastel/ }));
    await userEvent.click(screen.getByRole("button", { name: "Both" }));
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(createAction).toHaveBeenCalledWith({ templateId: "floral", palette: "blush", language: "both" });
  });

  it("previews the current choice", async () => {
    render(<NewInvitationForm templates={templates} createAction={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Ivory" }));
    expect(screen.getByTitle("Royal Rajasthani preview")).toHaveAttribute("src", "/preview/template/royal?palette=ivory&lang=en");
  });

  it("shows why creating failed", async () => {
    const createAction = vi.fn(async () => ({ ok: false, message: "Couldn't create the invitation. Please try again." }));
    render(<NewInvitationForm templates={templates} createAction={createAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create the invitation. Please try again.");
    expect(screen.getByRole("button", { name: "Create invitation" })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/invitations/NewInvitationForm.test.jsx`
Expected: FAIL. `./NewInvitationForm` can't be resolved.

- [ ] **Step 3: Implement the picker**

`src/AdminModule/invitations/NewInvitationForm.jsx`:

```jsx
"use client";

import { useState } from "react";
import PhoneFrame from "../PhoneFrame";
import { chipClass } from "../ui";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

// Next.js signals a server-action redirect with an error whose digest starts with NEXT_REDIRECT.
const isRedirect = (err) => typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");

export default function NewInvitationForm({ templates, createAction }) {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const template = templates.find((t) => t.id === templateId);
  const [palette, setPalette] = useState(template.palettes[0].id);
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function chooseTemplate(id) {
    setTemplateId(id);
    setPalette(templates.find((t) => t.id === id).palettes[0].id);
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await createAction({ templateId, palette, language });
      // On success the action redirects to the editor, so only a failure comes back here.
      if (result && !result.ok) {
        setError(result.message);
        setBusy(false);
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  const src = `/preview/template/${templateId}?palette=${encodeURIComponent(palette)}&lang=${language}`;

  return (
    <div className="mt-6 flex flex-col gap-8 lg:flex-row">
      <div className="flex flex-col gap-6 lg:w-96">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Design</legend>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === templateId}
                onClick={() => chooseTemplate(t.id)}
                className={`min-h-[44px] rounded-xl border p-3 text-left ${t.id === templateId ? "border-stone-900 bg-white" : "border-stone-200 bg-white hover:border-stone-400"}`}
              >
                <span className="block font-medium">{t.name}</span>
                <span className="block text-sm text-stone-600">{t.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Colour palette</legend>
          <div className="flex flex-wrap gap-2">
            {template.palettes.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === palette} onClick={() => setPalette(p.id)} className={chipClass(p.id === palette)}>
                <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.primary} 50%)` }} />
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Language</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <button key={l.id} type="button" aria-pressed={l.id === language} onClick={() => setLanguage(l.id)} className={chipClass(l.id === language)}>
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create invitation"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="text-xs text-stone-500">You can change the design, colours and language later without losing anything.</p>
      </div>
      <PhoneFrame src={src} title={`${template.name} preview`} scale={0.7} />
    </div>
  );
}
```

- [ ] **Step 4: Add the template choices helper and the page**

`src/AdminModule/invitations/templateChoices.js`:

```js
import { TEMPLATES } from "@/InvitationModule/templates/registry";

/** Templates as plain data (no components), safe to pass to client components. */
export function templateChoices() {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    palettes: t.palettes.map((p) => ({ id: p.id, name: p.name, bg: p.vars["--bg"], primary: p.vars["--primary"] })),
  }));
}
```

`src/app/(admin)/admin/(staff)/invitations/new/page.js`:

```js
import Link from "next/link";
import { requireStaff } from "@/AdminModule/auth/server";
import { createInvitationAction } from "@/AdminModule/invitations/actions";
import NewInvitationForm from "@/AdminModule/invitations/NewInvitationForm";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";

export const metadata = { title: "New invitation · Baba Saab Admin" };

export default async function NewInvitationPage() {
  await requireStaff();
  const templates = templateChoices();

  return (
    <div className="max-w-5xl">
      <Link href="/admin/invitations" className="text-sm text-stone-600 hover:underline">
        ← All invitations
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New invitation</h1>
      <p className="text-stone-600">Choose a design, colours and language. You&apos;ll fill in the couple&apos;s details next.</p>
      <NewInvitationForm templates={templates} createAction={createInvitationAction} />
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/invitations/NewInvitationForm.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Update the staff guide**

`docs/admin-guide.md`: insert directly after the `## Invitations` section:

```markdown
## Creating an invitation

1. Open **Invitations** and click **New invitation**.
2. Pick a **design**. The phone on the right shows it with sample details.
3. Pick a **colour palette** and the **language**: English, हिंदी, or **Both** (each line in English with Hindi underneath).
4. Click **Create invitation**. The editor opens on step 2, ready for the couple's details.

You can change the design, colours and language later without losing anything you've typed.
```

- [ ] **Step 7: Run all tests, build and commit**

```bash
npm test
npx next build
git add src/AdminModule/invitations/templateChoices.js src/AdminModule/invitations/NewInvitationForm.jsx src/AdminModule/invitations/NewInvitationForm.test.jsx "src/app/(admin)/admin/(staff)/invitations/new/page.js" docs/admin-guide.md
git commit -m "feat(admin): add new-invitation picker"
```

Expected: tests pass; the build lists `/admin/invitations/new`.

---


### Task 6: Editing primitives and steps ①–③

**Files:**
- Create: `src/AdminModule/editor/paths.js`, `src/AdminModule/editor/paths.test.js`
- Create: `src/AdminModule/editor/fields.jsx`, `src/AdminModule/editor/fields.test.jsx`
- Create: `src/AdminModule/editor/test-utils.jsx`
- Create: `src/AdminModule/editor/steps/TemplateStep.jsx`, `src/AdminModule/editor/steps/TemplateStep.test.jsx`
- Create: `src/AdminModule/editor/steps/CoupleStep.jsx`, `src/AdminModule/editor/steps/CoupleStep.test.jsx`
- Create: `src/AdminModule/editor/steps/VenueStep.jsx`, `src/AdminModule/editor/steps/VenueStep.test.jsx`

**Interfaces:**
- Consumes:
  - `cleanDraft` (Task 1), `requiredLanguages` (Task 1)
  - `chipClass` (Task 4), `templateChoices()` shape (Task 5)
  - `INVOCATIONS` (lib/invocations.js), `hasText` (lib/i18n.js)
- Produces:
  - `getIn(obj, path)` and `setIn(obj, path, value) → copy`. In `setIn`, `undefined` removes the key.
  - Fields:
    - `Group({ title, children })`
    - `TextInput({ label, value, onChange(string), error?, hint?, type?, multiline?, lang?, inputMode?, placeholder? })`
    - `LocalisedInput({ label, value, onChange(localisedObject), language, multiline?, hint? })`
    - `Toggle({ label, description?, checked, onChange(boolean) })`
    - `ChipGroup({ legend, options: { id, label, swatch? }[], value, onChange(id) })`
    - `FULL_LINK_HINT`
  - **Step component contract**, which every step in Tasks 6–8 follows: `Step({ content, update(path, value), errors: Record<pathKey,string>, language, templates, onGoToStep(n) })`. A step reads from `content` and writes only through `update`.
  - Test helper `renderStep(Step, initialContent, extraProps?) → { ...renderResult, latest() }` and `TEMPLATE_CHOICES` fixture (test-utils.jsx).
  - `TemplateStep`, `CoupleStep`, `VenueStep`.

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/editor/paths.test.js`:

```js
import { describe, expect, it } from "vitest";
import { getIn, setIn } from "./paths";

describe("getIn", () => {
  it("reads nested values and tolerates gaps", () => {
    expect(getIn({ a: { b: [10, 20] } }, ["a", "b", 1])).toBe(20);
    expect(getIn({}, ["a", "b"])).toBeUndefined();
  });
});

describe("setIn", () => {
  it("sets a nested value without mutating the original", () => {
    const original = { couple: { bride: { name: { en: "Priya" } } } };
    const next = setIn(original, ["couple", "groom", "name"], { en: "Rahul" });
    expect(next.couple).toEqual({ bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } });
    expect(original.couple.groom).toBeUndefined();
    expect(next.couple.bride).toBe(original.couple.bride);
  });

  it("updates one array element", () => {
    const next = setIn({ events: [{ id: "a" }, { id: "b" }] }, ["events", 1, "time"], "19:30");
    expect(next.events).toEqual([{ id: "a" }, { id: "b", time: "19:30" }]);
    expect(Array.isArray(next.events)).toBe(true);
  });

  it("removes a key when the value is undefined", () => {
    expect(setIn({ venue: { mapsUrl: "x", name: { en: "R" } } }, ["venue", "mapsUrl"], undefined)).toEqual({ venue: { name: { en: "R" } } });
  });
});
```

`src/AdminModule/editor/fields.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocalisedInput, TextInput } from "./fields";

describe("LocalisedInput", () => {
  it("shows English and Hindi fields side by side for a bilingual invitation", () => {
    render(<LocalisedInput label="Bride's name" value={{ en: "Priya", hi: "प्रिया" }} language="both" onChange={() => {}} />);
    expect(screen.getByLabelText("Bride's name (English)")).toHaveValue("Priya");
    expect(screen.getByLabelText("Bride's name (हिंदी)")).toHaveValue("प्रिया");
    expect(screen.getByLabelText("Bride's name (हिंदी)")).toHaveAttribute("lang", "hi");
  });

  it("shows one field for a single-language invitation but keeps the other language's text", () => {
    const onChange = vi.fn();
    render(<LocalisedInput label="Bride's name" value={{ en: "Priya", hi: "प्रिया" }} language="en" onChange={onChange} />);
    expect(screen.queryByLabelText(/हिंदी/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priyanka" } });
    expect(onChange).toHaveBeenCalledWith({ en: "Priyanka", hi: "प्रिया" });
  });
});

describe("TextInput", () => {
  it("marks an invalid value and explains it", () => {
    render(<TextInput label="Google Maps link" value="maps.google.com" error="Use the full link" onChange={() => {}} />);
    const input = screen.getByLabelText("Google Maps link");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use the full link");
  });

  it("shows a hint when there is no error", () => {
    render(<TextInput label="Phone" value="" hint="Shown to guests" onChange={() => {}} />);
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription("Shown to guests");
  });
});
```

`src/AdminModule/editor/steps/TemplateStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplateStep from "./TemplateStep";
import { renderStep, TEMPLATE_CHOICES } from "../test-utils";

const start = () => ({
  templateId: "royal",
  theme: { palette: "ivory" },
  language: "both",
  couple: { bride: { name: { en: "Priya", hi: "प्रिया" } } },
});

describe("TemplateStep", () => {
  it("switches design and moves to that design's first palette, keeping all content", async () => {
    const { latest } = renderStep(TemplateStep, start(), { templates: TEMPLATE_CHOICES });
    await userEvent.click(screen.getByRole("button", { name: "Floral Pastel" }));
    expect(latest().templateId).toBe("floral");
    expect(latest().theme.palette).toBe("blush");
    expect(latest().couple).toEqual(start().couple);
  });

  it("changes palette", async () => {
    const { latest } = renderStep(TemplateStep, start(), { templates: TEMPLATE_CHOICES });
    await userEvent.click(screen.getByRole("button", { name: "Maroon & Gold" }));
    expect(latest().theme.palette).toBe("maroon-gold");
  });

  it("switching to English only never deletes the Hindi text", async () => {
    const { latest } = renderStep(TemplateStep, start(), { templates: TEMPLATE_CHOICES });
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(latest().language).toBe("en");
    expect(latest().couple.bride.name).toEqual({ en: "Priya", hi: "प्रिया" });
  });
});
```

`src/AdminModule/editor/steps/CoupleStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoupleStep from "./CoupleStep";
import { renderStep } from "../test-utils";

const base = (language = "both") => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language });

describe("CoupleStep", () => {
  it("asks for both languages on a bilingual invitation", () => {
    renderStep(CoupleStep, base("both"));
    expect(screen.getByLabelText("Bride's name (English)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bride's name (हिंदी)")).toBeInTheDocument();
  });

  it("stores the names as they are typed", () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: "Rahul" } });
    expect(latest().couple).toEqual({ bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } });
  });

  it("adds and removes families", async () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    await userEvent.click(screen.getByRole("button", { name: "Add a family" }));
    fireEvent.change(screen.getByLabelText("Family 1"), { target: { value: "Sharma Parivar" } });
    expect(latest().hosts.families).toEqual([{ en: "Sharma Parivar" }]);
    await userEvent.click(screen.getByRole("button", { name: "Remove family 1" }));
    expect(latest().hosts.families).toEqual([]);
  });

  it("chooses a preset shloka or the family's own text", async () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Shloka" }), "mangalam");
    expect(latest().invocation.presetId).toBe("mangalam");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Shloka" }), "custom");
    expect(latest().invocation.presetId).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Shloka text"), { target: { value: "॥ श्री ॥" } });
    expect(latest().invocation.text).toEqual({ en: "॥ श्री ॥" });
  });

  it("stores the contact phone and clears it when emptied", () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    fireEvent.change(screen.getByLabelText("Family contact phone"), { target: { value: "+91 98765 43210" } });
    expect(latest().hosts.contactPhone).toBe("+91 98765 43210");
    fireEvent.change(screen.getByLabelText("Family contact phone"), { target: { value: "" } });
    expect(latest().hosts.contactPhone).toBeUndefined();
  });
});
```

`src/AdminModule/editor/steps/VenueStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import VenueStep from "./VenueStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("VenueStep", () => {
  it("stores the wedding date and venue", () => {
    const { latest } = renderStep(VenueStep, base());
    fireEvent.change(screen.getByLabelText("Main wedding date"), { target: { value: "2027-02-14" } });
    fireEvent.change(screen.getByLabelText("Venue name"), { target: { value: "Riviera Resort" } });
    expect(latest().mainDate).toBe("2027-02-14");
    expect(latest().venue.name).toEqual({ en: "Riviera Resort" });
  });

  it("explains a Maps link that isn't a full link, without losing the rest", () => {
    const { latest } = renderStep(VenueStep, { ...base(), venue: { name: { en: "Riviera" } } });
    fireEvent.change(screen.getByLabelText("Google Maps link"), { target: { value: "maps.google.com/x" } });
    const input = screen.getByLabelText("Google Maps link");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use the full link, starting with https://");
    expect(latest().venue.name).toEqual({ en: "Riviera" });
  });

  it("removes the Maps link when cleared", () => {
    const { latest } = renderStep(VenueStep, { ...base(), venue: { mapsUrl: "https://maps.app.goo.gl/x" } });
    fireEvent.change(screen.getByLabelText("Google Maps link"), { target: { value: "" } });
    expect(latest().venue).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/editor`
Expected: FAIL. `./paths`, `./fields`, `../test-utils` and the step modules can't be resolved.

- [ ] **Step 3: Implement paths**

`src/AdminModule/editor/paths.js`:

```js
export function getIn(obj, path) {
  return path.reduce((value, key) => (value == null ? undefined : value[key]), obj);
}

/** A copy of `obj` with `value` at `path`; `undefined` removes the key. Untouched branches are shared. */
export function setIn(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  const next = setIn(obj?.[head], rest, value);
  if (next === undefined && !Array.isArray(copy)) delete copy[head];
  else copy[head] = next;
  return copy;
}
```

- [ ] **Step 4: Implement the field components**

`src/AdminModule/editor/fields.jsx`:

```jsx
"use client";

import { useId } from "react";
import { requiredLanguages } from "@/InvitationModule/lib/checklist";
import { chipClass } from "../ui";

export const FULL_LINK_HINT = "Use the full link, starting with https://";

const inputClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm aria-[invalid=true]:border-red-600";
const LANGUAGE_LABELS = { en: "English", hi: "हिंदी" };

export function Group({ title, children }) {
  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function TextInput({ label, value, onChange, error, hint, type = "text", multiline = false, lang, inputMode, placeholder }) {
  const id = useId();
  const note = error ?? hint;
  const Tag = multiline ? "textarea" : "input";
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Tag
        id={id}
        type={multiline ? undefined : type}
        rows={multiline ? 3 : undefined}
        value={value ?? ""}
        lang={lang}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {note && (
        <p id={`${id}-note`} className={`mt-1 text-xs ${error ? "text-red-700" : "text-stone-500"}`}>
          {note}
        </p>
      )}
    </div>
  );
}

/** One input per language the invitation uses. Text in a language that is switched off is kept. */
export function LocalisedInput({ label, value, onChange, language, multiline = false, hint }) {
  const langs = requiredLanguages(language);
  const both = langs.length > 1;
  return (
    <div className={both ? "grid gap-3 sm:grid-cols-2" : undefined}>
      {langs.map((lang) => (
        <TextInput
          key={lang}
          label={both ? `${label} (${LANGUAGE_LABELS[lang]})` : label}
          value={value?.[lang]}
          lang={lang}
          multiline={multiline}
          hint={hint}
          onChange={(text) => onChange({ ...value, [lang]: text })}
        />
      ))}
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex min-h-[44px] items-start gap-3">
      <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5" />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">{label}</span>
        {description && <span className="block text-stone-500">{description}</span>}
      </label>
    </div>
  );
}

export function ChipGroup({ legend, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.id} type="button" aria-pressed={option.id === value} onClick={() => onChange(option.id)} className={chipClass(option.id === value)}>
            {option.swatch && <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: option.swatch }} />}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 5: Implement the test helper**

`src/AdminModule/editor/test-utils.jsx`:

```jsx
import { useState } from "react";
import { render } from "@testing-library/react";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { setIn } from "./paths";

export const TEMPLATE_CHOICES = [
  {
    id: "royal",
    name: "Royal Rajasthani",
    description: "Maroon and gold.",
    palettes: [
      { id: "maroon-gold", name: "Maroon & Gold", bg: "#fff8f0", primary: "#7a1f2b" },
      { id: "ivory", name: "Ivory", bg: "#fffdf7", primary: "#a87a2a" },
    ],
  },
  {
    id: "floral",
    name: "Floral Pastel",
    description: "Soft florals.",
    palettes: [{ id: "blush", name: "Blush", bg: "#fff5f6", primary: "#c27a8a" }],
  },
];

/** Renders a step with real editor state, the way EditorShell does. `latest()` returns the current content. */
export function renderStep(Step, initial, extraProps = {}) {
  let current = initial;
  function Harness() {
    const [content, setContent] = useState(initial);
    current = content;
    const update = (path, value) => setContent((c) => setIn(c, path, value));
    const { errors } = cleanDraft(content);
    return <Step content={content} update={update} errors={errors} language={content.language ?? "en"} templates={TEMPLATE_CHOICES} onGoToStep={() => {}} {...extraProps} />;
  }
  const utils = render(<Harness />);
  return { ...utils, latest: () => current };
}
```

- [ ] **Step 6: Implement step ① Template & palette**

`src/AdminModule/editor/steps/TemplateStep.jsx`:

```jsx
"use client";

import { ChipGroup } from "../fields";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

export default function TemplateStep({ content, update, templates }) {
  const current = templates.find((t) => t.id === content.templateId) ?? templates[0];

  function chooseTemplate(id) {
    const next = templates.find((t) => t.id === id);
    update(["templateId"], id);
    if (!next.palettes.some((p) => p.id === content.theme?.palette)) update(["theme", "palette"], next.palettes[0].id);
  }

  return (
    <div className="space-y-6">
      <ChipGroup legend="Design" options={templates.map((t) => ({ id: t.id, label: t.name }))} value={content.templateId} onChange={chooseTemplate} />
      <ChipGroup
        legend="Colour palette"
        options={current.palettes.map((p) => ({ id: p.id, label: p.name, swatch: `linear-gradient(135deg, ${p.bg} 50%, ${p.primary} 50%)` }))}
        value={content.theme?.palette}
        onChange={(id) => update(["theme", "palette"], id)}
      />
      <ChipGroup legend="Language" options={LANGUAGE_OPTIONS} value={content.language ?? "en"} onChange={(id) => update(["language"], id)} />
      <p className="text-sm text-stone-500">
        Changing the design, colours or language never deletes anything you&apos;ve typed. Text in a language you switch off is
        kept, and comes back if you switch that language on again.
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Implement step ② Couple & families**

`src/AdminModule/editor/steps/CoupleStep.jsx`:

```jsx
"use client";

import { useId, useState } from "react";
import { INVOCATIONS } from "@/InvitationModule/lib/invocations";
import { hasText } from "@/InvitationModule/lib/i18n";
import { Group, LocalisedInput, TextInput } from "../fields";

const MAX_FAMILIES = 6;
const EMBLEMS = [
  { id: "ganesh", label: "Shri Ganesh" },
  { id: "om", label: "Om" },
  { id: "none", label: "None" },
];
const selectClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm";
const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100";

function shlokaChoice(invocation) {
  if (invocation?.presetId) return invocation.presetId;
  return hasText(invocation?.text) ? "custom" : "none";
}

export default function CoupleStep({ content, update, language }) {
  const [shloka, setShloka] = useState(() => shlokaChoice(content.invocation));
  const symbolId = useId();
  const shlokaId = useId();
  const families = content.hosts?.families ?? [];

  function chooseShloka(id) {
    setShloka(id);
    update(["invocation", "presetId"], id === "custom" || id === "none" ? undefined : id);
    if (id === "none") update(["invocation", "text"], undefined);
  }

  const person = (who, title, parentsHint) => (
    <Group title={title}>
      <LocalisedInput
        label={who === "bride" ? "Bride's name" : "Groom's name"}
        value={content.couple?.[who]?.name}
        language={language}
        onChange={(v) => update(["couple", who, "name"], v)}
      />
      <LocalisedInput
        label={who === "bride" ? "Bride's parents" : "Groom's parents"}
        hint={parentsHint}
        value={content.couple?.[who]?.parentsLine}
        language={language}
        onChange={(v) => update(["couple", who, "parentsLine"], v)}
      />
    </Group>
  );

  return (
    <div className="space-y-6">
      {person("bride", "Bride", 'For example "D/o Smt. Sunita & Shri Rajesh Sharma"')}
      {person("groom", "Groom", 'For example "S/o Smt. Kavita & Shri Anil Mehra"')}

      <Group title="Blessing at the top">
        <div>
          <label htmlFor={symbolId} className="text-sm font-medium">
            Symbol
          </label>
          <select id={symbolId} value={content.invocation?.deity ?? "ganesh"} onChange={(e) => update(["invocation", "deity"], e.target.value)} className={selectClass}>
            {EMBLEMS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={shlokaId} className="text-sm font-medium">
            Shloka
          </label>
          <select id={shlokaId} value={shloka} onChange={(e) => chooseShloka(e.target.value)} className={selectClass}>
            <option value="none">None</option>
            {INVOCATIONS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
            <option value="custom">Our own text</option>
          </select>
        </div>
        {shloka === "custom" && (
          <LocalisedInput label="Shloka text" multiline value={content.invocation?.text} language={language} onChange={(v) => update(["invocation", "text"], v)} />
        )}
      </Group>

      <Group title="Families and closing message">
        {families.map((family, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <LocalisedInput
                label={`Family ${i + 1}`}
                value={family}
                language={language}
                onChange={(v) => update(["hosts", "families"], families.map((f, j) => (j === i ? v : f)))}
              />
            </div>
            <button type="button" aria-label={`Remove family ${i + 1}`} onClick={() => update(["hosts", "families"], families.filter((_, j) => j !== i))} className={smallButton}>
              Remove
            </button>
          </div>
        ))}
        {families.length < MAX_FAMILIES && (
          <button type="button" onClick={() => update(["hosts", "families"], [...families, {}])} className={smallButton}>
            Add a family
          </button>
        )}
        <LocalisedInput
          label="Closing line"
          multiline
          hint='For example "With love and blessings from the Sharma and Mehra families"'
          value={content.hosts?.closingLine}
          language={language}
          onChange={(v) => update(["hosts", "closingLine"], v)}
        />
        <TextInput
          label="Family contact phone"
          type="tel"
          inputMode="tel"
          value={content.hosts?.contactPhone}
          hint="Shown to guests after RSVPs close. Also used to search for this invitation."
          onChange={(v) => update(["hosts", "contactPhone"], v || undefined)}
        />
      </Group>
    </div>
  );
}
```

- [ ] **Step 8: Implement step ③ Date, venue & travel**

`src/AdminModule/editor/steps/VenueStep.jsx`:

```jsx
"use client";

import { FULL_LINK_HINT, Group, LocalisedInput, TextInput } from "../fields";

export default function VenueStep({ content, update, errors, language }) {
  return (
    <div className="space-y-6">
      <Group title="Wedding date">
        <TextInput
          label="Main wedding date"
          type="date"
          value={content.mainDate}
          error={errors.mainDate}
          hint="Used for the countdown and the save-the-date."
          onChange={(v) => update(["mainDate"], v || undefined)}
        />
      </Group>
      <Group title="Venue">
        <LocalisedInput label="Venue name" value={content.venue?.name} language={language} onChange={(v) => update(["venue", "name"], v)} />
        <LocalisedInput label="Address" multiline value={content.venue?.address} language={language} onChange={(v) => update(["venue", "address"], v)} />
        <TextInput
          label="Google Maps link"
          type="url"
          value={content.venue?.mapsUrl}
          error={errors["venue.mapsUrl"] ? FULL_LINK_HINT : undefined}
          hint="Open the venue in Google Maps, tap Share, copy the link and paste it here."
          onChange={(v) => update(["venue", "mapsUrl"], v.trim() || undefined)}
        />
      </Group>
      <Group title="Travel notes">
        <LocalisedInput
          label="Travel notes"
          multiline
          hint="Nearest airport and railway station, weather tips. One point per line."
          value={content.venue?.travelNotes}
          language={language}
          onChange={(v) => update(["venue", "travelNotes"], v)}
        />
      </Group>
    </div>
  );
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/editor`
Expected: PASS (all files).

- [ ] **Step 10: Run all tests and commit**

```bash
npm test
git add src/AdminModule/editor
git commit -m "feat(editor): add field components and steps for template, couple and venue"
```

---


### Task 7: Steps ④ Events, ⑤ Film, ⑥ Sections

**Files:**
- Create: `src/AdminModule/editor/steps/EventsStep.jsx`, `src/AdminModule/editor/steps/EventsStep.test.jsx`
- Create: `src/AdminModule/editor/steps/MediaStep.jsx`, `src/AdminModule/editor/steps/MediaStep.test.jsx`
- Create: `src/AdminModule/editor/steps/SectionsStep.jsx`, `src/AdminModule/editor/steps/SectionsStep.test.jsx`
- Modify: `src/InvitationModule/lib/sections.js`, `src/InvitationModule/lib/sections.test.js`

**Interfaces:**
- Consumes:
  - the Task 6 step contract, `Group`, `TextInput`, `LocalisedInput`, `FULL_LINK_HINT`, `renderStep`
  - `chipClass` (Task 4)
  - `youtubeId(url) → string | null` (lib/media.js), `textFor` (lib/i18n.js)
  - `SECTION_IDS` (schema)
- Produces:
  - `orderedSectionIds(theme) → SectionId[]`, the full order with unknown ids removed and missing ids appended. `visibleSections` now uses it.
  - `EVENT_PRESETS`
  - `EventsStep`, `MediaStep`, `SectionsStep`
  - `SECTION_LABELS: Record<SectionId, string>`

- [ ] **Step 1: Write the failing tests**

Append to `src/InvitationModule/lib/sections.test.js`, and add `orderedSectionIds` to its import from `./sections`:

```js
describe("orderedSectionIds", () => {
  it("keeps the staff order, drops unknown ids and appends missing ones", () => {
    const order = orderedSectionIds({ sectionOrder: ["venue", "bogus", "couple", "venue"] });
    expect(order.slice(0, 2)).toEqual(["venue", "couple"]);
    expect(order).toHaveLength(SECTION_IDS.length);
    expect(new Set(order)).toEqual(new Set(SECTION_IDS));
  });

  it("uses the default order when none is stored", () => {
    expect(orderedSectionIds(undefined)).toEqual(SECTION_IDS);
  });
});
```

If `SECTION_IDS` isn't imported in that test file yet, add `import { SECTION_IDS } from "../schema/invitation";`.

`src/AdminModule/editor/steps/EventsStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventsStep from "./EventsStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en", mainDate: "2027-02-14" });

describe("EventsStep", () => {
  it("adds a common event with its English and Hindi name, dated on the wedding day", async () => {
    const { latest } = renderStep(EventsStep, base());
    await userEvent.click(screen.getByRole("button", { name: "+ Sangeet" }));
    const [event] = latest().events;
    expect(event).toMatchObject({ name: { en: "Sangeet", hi: "संगीत" }, date: "2027-02-14" });
    expect(event.id).toMatch(/^[a-z0-9]{6,}$/i);
  });

  it("adds a blank event with no date when there is no wedding date yet", async () => {
    const { latest } = renderStep(EventsStep, { ...base(), mainDate: undefined });
    await userEvent.click(screen.getByRole("button", { name: "+ Other event" }));
    expect(latest().events[0]).toEqual({ id: expect.any(String), name: {} });
  });

  it("edits, reorders and removes events", async () => {
    const start = { ...base(), events: [{ id: "a", name: { en: "Haldi" } }, { id: "b", name: { en: "Mehendi" } }] };
    const { latest } = renderStep(EventsStep, start);
    fireEvent.change(screen.getAllByLabelText("Time")[0], { target: { value: "10:00" } });
    expect(latest().events[0].time).toBe("10:00");
    await userEvent.click(screen.getByRole("button", { name: "Move Mehendi up" }));
    expect(latest().events.map((e) => e.id)).toEqual(["b", "a"]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Haldi" }));
    expect(latest().events.map((e) => e.id)).toEqual(["b"]);
  });

  it("explains an invalid time", () => {
    renderStep(EventsStep, { ...base(), events: [{ id: "a", name: { en: "Haldi" }, time: "25:00" }] });
    expect(screen.getByLabelText("Time")).toHaveAccessibleDescription("Use HH:mm (24-hour)");
  });
});
```

`src/AdminModule/editor/steps/MediaStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import MediaStep from "./MediaStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("MediaStep", () => {
  it("stores a YouTube film link", () => {
    const { latest } = renderStep(MediaStep, base());
    fireEvent.change(screen.getByLabelText("YouTube link"), { target: { value: " https://youtu.be/dQw4w9WgXcQ " } });
    expect(latest().media.film).toEqual({ type: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" });
  });

  it("explains a link that isn't YouTube", () => {
    renderStep(MediaStep, { ...base(), media: { film: { type: "youtube", url: "https://example.com/film" } } });
    expect(screen.getByLabelText("YouTube link")).toHaveAttribute("aria-invalid", "true");
  });

  it("removes the film when the link is cleared", () => {
    const { latest } = renderStep(MediaStep, { ...base(), media: { film: { type: "youtube", url: "https://youtu.be/x" } } });
    fireEvent.change(screen.getByLabelText("YouTube link"), { target: { value: "" } });
    expect(latest().media).toEqual({});
  });

  it("says photos and music are coming", () => {
    renderStep(MediaStep, base());
    expect(screen.getByText(/coming in the next release/)).toBeInTheDocument();
  });
});
```

`src/AdminModule/editor/steps/SectionsStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SectionsStep from "./SectionsStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("SectionsStep", () => {
  it("lists every section in order, all shown by default", () => {
    renderStep(SectionsStep, base());
    const items = within(screen.getByRole("list", { name: "Sections in order" })).getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items[0]).toHaveTextContent("Blessing");
    expect(screen.getByRole("checkbox", { name: "Show Travel notes" })).toBeChecked();
  });

  it("hides and shows a section", async () => {
    const { latest } = renderStep(SectionsStep, base());
    await userEvent.click(screen.getByRole("checkbox", { name: "Show Travel notes" }));
    expect(latest().theme.hidden).toEqual(["travel"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "Show Travel notes" }));
    expect(latest().theme.hidden).toEqual([]);
  });

  it("moves a section and stores the full order", async () => {
    const { latest } = renderStep(SectionsStep, base());
    await userEvent.click(screen.getByRole("button", { name: "Move Venue & map up" }));
    const order = latest().theme.sectionOrder;
    expect(order.indexOf("venue")).toBeLessThan(order.indexOf("countdown"));
    expect(order).toHaveLength(11);
    expect(latest().theme.palette).toBe("maroon-gold");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/InvitationModule/lib/sections.test.js src/AdminModule/editor/steps`
Expected: FAIL. `orderedSectionIds` isn't exported, and the three new step modules can't be resolved.

- [ ] **Step 3: Extract the section order rule**

`src/InvitationModule/lib/sections.js`: replace the `visibleSections` function (and its comment) with:

```js
// Staff order first; unknown ids dropped; any section missing from that order is appended so new sections never vanish.
export function orderedSectionIds(theme) {
  const order = [...new Set((theme?.sectionOrder ?? []).filter((id) => SECTION_IDS.includes(id)))];
  for (const id of SECTION_IDS) if (!order.includes(id)) order.push(id);
  return order;
}

export function visibleSections(inv) {
  const hidden = new Set(inv.theme.hidden);
  return orderedSectionIds(inv.theme).filter((id) => !hidden.has(id) && hasContent[id](inv));
}
```

- [ ] **Step 4: Implement step ④ Events**

`src/AdminModule/editor/steps/EventsStep.jsx`:

```jsx
"use client";

import { textFor } from "@/InvitationModule/lib/i18n";
import { chipClass } from "../../ui";
import { FULL_LINK_HINT, Group, LocalisedInput, TextInput } from "../fields";

export const EVENT_PRESETS = [
  { key: "haldi", name: { en: "Haldi", hi: "हल्दी" } },
  { key: "mehendi", name: { en: "Mehendi", hi: "मेहंदी" } },
  { key: "sangeet", name: { en: "Sangeet", hi: "संगीत" } },
  { key: "vivah", name: { en: "Vivah", hi: "विवाह" } },
  { key: "reception", name: { en: "Reception", hi: "स्वागत समारोह" } },
];

const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-40";
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

export default function EventsStep({ content, update, errors, language }) {
  const events = content.events ?? [];
  const setEvents = (next) => update(["events"], next);
  const add = (name = {}) => setEvents([...events, { id: newId(), name, ...(content.mainDate ? { date: content.mainDate } : {}) }]);
  const move = (from, to) => {
    const next = [...events];
    const [event] = next.splice(from, 1);
    next.splice(to, 0, event);
    setEvents(next);
  };
  const at = (i, key) => ["events", i, key];

  return (
    <div className="space-y-6">
      {events.length === 0 && <p className="text-sm text-stone-600">No events yet. Add each function guests are invited to.</p>}

      {events.map((event, i) => {
        const title = textFor(event.name, language === "hi" ? "hi" : "en") || `Event ${i + 1}`;
        return (
          <Group key={event.id} title={title}>
            <LocalisedInput label="Event name" value={event.name} language={language} onChange={(v) => update(at(i, "name"), v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Date" type="date" value={event.date} error={errors[`events.${i}.date`]} onChange={(v) => update(at(i, "date"), v || undefined)} />
              <TextInput label="Time" type="time" value={event.time} error={errors[`events.${i}.time`]} onChange={(v) => update(at(i, "time"), v || undefined)} />
            </div>
            <LocalisedInput label="Venue (if different)" value={event.venueName} language={language} onChange={(v) => update(at(i, "venueName"), v)} />
            <LocalisedInput label="Address (if different)" multiline value={event.address} language={language} onChange={(v) => update(at(i, "address"), v)} />
            <TextInput
              label="Google Maps link (if different)"
              type="url"
              value={event.mapsUrl}
              error={errors[`events.${i}.mapsUrl`] ? FULL_LINK_HINT : undefined}
              onChange={(v) => update(at(i, "mapsUrl"), v.trim() || undefined)}
            />
            <LocalisedInput label="Dress code" value={event.dressCode} language={language} onChange={(v) => update(at(i, "dressCode"), v)} />
            <LocalisedInput label="Description" multiline value={event.description} language={language} onChange={(v) => update(at(i, "description"), v)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${title} up`} className={smallButton}>
                Move up
              </button>
              <button type="button" disabled={i === events.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${title} down`} className={smallButton}>
                Move down
              </button>
              <button type="button" onClick={() => setEvents(events.filter((_, j) => j !== i))} aria-label={`Remove ${title}`} className={smallButton}>
                Remove
              </button>
            </div>
          </Group>
        );
      })}

      <div>
        <p className="text-sm font-medium">Add an event</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EVENT_PRESETS.map((preset) => (
            <button key={preset.key} type="button" onClick={() => add(preset.name)} className={chipClass(false)}>
              + {preset.name.en}
            </button>
          ))}
          <button type="button" onClick={() => add()} className={chipClass(false)}>
            + Other event
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement step ⑤ Photos, film & music**

`src/AdminModule/editor/steps/MediaStep.jsx`:

```jsx
"use client";

import { youtubeId } from "@/InvitationModule/lib/media";
import { Group, TextInput } from "../fields";

export default function MediaStep({ content, update, errors }) {
  const url = content.media?.film?.url ?? "";
  const invalid = Boolean(url) && (!youtubeId(url) || Boolean(errors["media.film.url"]));

  return (
    <div className="space-y-6">
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
      <Group title="Photos and music">
        <p className="text-sm text-stone-600">Cover photo, photo gallery and background music are coming in the next release.</p>
      </Group>
    </div>
  );
}
```

- [ ] **Step 6: Implement step ⑥ Sections**

`src/AdminModule/editor/steps/SectionsStep.jsx`:

```jsx
"use client";

import { orderedSectionIds } from "@/InvitationModule/lib/sections";

export const SECTION_LABELS = {
  invocation: "Blessing (Ganesh, shloka)",
  couple: "The couple",
  saveTheDate: "Save the date",
  countdown: "Countdown",
  venue: "Venue & map",
  travel: "Travel notes",
  schedule: "Events schedule",
  gallery: "Photo gallery",
  film: "Invitation film",
  rsvp: "RSVP form",
  closing: "Closing message & families",
};

const smallButton = "min-h-[44px] rounded-full border border-stone-300 px-3 text-sm hover:bg-stone-100 disabled:opacity-40";

export default function SectionsStep({ content, update }) {
  const order = orderedSectionIds(content.theme);
  const hidden = content.theme?.hidden ?? [];

  const move = (from, to) => {
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    update(["theme", "sectionOrder"], next);
  };
  const setShown = (id, shown) => update(["theme", "hidden"], shown ? hidden.filter((h) => h !== id) : [...hidden, id]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        The cover always comes first. Sections with nothing filled in stay hidden on the invitation automatically.
      </p>
      <ol aria-label="Sections in order" className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {order.map((id, i) => {
          const label = SECTION_LABELS[id];
          return (
            <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 font-medium">{label}</span>
              <label className="flex min-h-[44px] items-center gap-2 text-sm">
                <input type="checkbox" aria-label={`Show ${label}`} checked={!hidden.includes(id)} onChange={(e) => setShown(id, e.target.checked)} className="h-5 w-5" />
                Show
              </label>
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${label} up`} className={smallButton}>
                ↑
              </button>
              <button type="button" disabled={i === order.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${label} down`} className={smallButton}>
                ↓
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/InvitationModule src/AdminModule/editor/steps`
Expected: PASS, including every existing template test. Those exercise `visibleSections` through the refactored `orderedSectionIds`.

- [ ] **Step 8: Run all tests and commit**

```bash
npm test
git add src/InvitationModule/lib/sections.js src/InvitationModule/lib/sections.test.js src/AdminModule/editor/steps
git commit -m "feat(editor): add steps for events, film and sections"
```

---

### Task 8: Steps ⑦ RSVP & settings, ⑧ Review

**Files:**
- Create: `src/AdminModule/editor/steps/RsvpStep.jsx`, `src/AdminModule/editor/steps/RsvpStep.test.jsx`
- Create: `src/AdminModule/editor/steps/ReviewStep.jsx`, `src/AdminModule/editor/steps/ReviewStep.test.jsx`

**Interfaces:**
- Consumes:
  - the Task 6 step contract, `Group`, `TextInput`, `Toggle`, `renderStep`
  - `cleanDraft`, `publishChecklist` (Task 1)
- Produces:
  - `RsvpStep`
  - `ReviewStep`, which calls `onGoToStep(n)` from each checklist item

**Ruling carried from the spec:** archive settings (parent spec §8 step ⑦) belong to Phase 5, where archiving is built. Step ⑦ in 2a covers RSVP and the credit toggle only.

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/editor/steps/RsvpStep.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpStep from "./RsvpStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("RsvpStep", () => {
  it("shows the RSVP options only once RSVPs are switched on", async () => {
    const { latest } = renderStep(RsvpStep, base());
    expect(screen.queryByLabelText("Last day to RSVP")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Ask guests to RSVP/ }));
    expect(latest().rsvp.enabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Last day to RSVP"), { target: { value: "2027-01-31" } });
    expect(latest().rsvp.deadline).toBe("2027-01-31");
    expect(screen.getByRole("checkbox", { name: /how many people/ })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /meal preference/ }));
    expect(latest().rsvp.askMeal).toBe(true);
  });

  it("turns the Baba Saab credit off", async () => {
    const { latest } = renderStep(RsvpStep, base());
    const credit = screen.getByRole("checkbox", { name: /Created by Baba Saab Events/ });
    expect(credit).toBeChecked();
    await userEvent.click(credit);
    expect(latest().showCredit).toBe(false);
  });
});
```

`src/AdminModule/editor/steps/ReviewStep.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewStep from "./ReviewStep";
import { renderStep } from "../test-utils";

const complete = () => ({
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Riviera" }, address: { en: "MG Road" } },
});

describe("ReviewStep", () => {
  it("lists what is missing and jumps to the step that fixes it", async () => {
    const onGoToStep = vi.fn();
    renderStep(ReviewStep, { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" }, { onGoToStep });
    expect(screen.getByText("Add the bride's name")).toBeInTheDocument();
    expect(screen.getByText("Add the wedding date")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Go to step 3" })[0]);
    expect(onGoToStep).toHaveBeenCalledWith(3);
  });

  it("says when everything needed is filled in", () => {
    renderStep(ReviewStep, complete());
    expect(screen.getByText("Everything needed is filled in.")).toBeInTheDocument();
  });

  it("shows Publish as not yet available", () => {
    renderStep(ReviewStep, complete());
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText(/Publishing arrives in the next release/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/editor/steps/RsvpStep.test.jsx src/AdminModule/editor/steps/ReviewStep.test.jsx`
Expected: FAIL. The modules can't be resolved.

- [ ] **Step 3: Implement step ⑦ RSVP & settings**

`src/AdminModule/editor/steps/RsvpStep.jsx`:

```jsx
"use client";

import { Group, TextInput, Toggle } from "../fields";

export default function RsvpStep({ content, update, errors }) {
  const rsvp = content.rsvp ?? {};
  return (
    <div className="space-y-6">
      <Group title="RSVP">
        <Toggle
          label="Ask guests to RSVP"
          description="Adds a form where guests say whether they're coming."
          checked={rsvp.enabled}
          onChange={(v) => update(["rsvp", "enabled"], v)}
        />
        {rsvp.enabled && (
          <>
            <TextInput
              label="Last day to RSVP"
              type="date"
              value={rsvp.deadline}
              error={errors["rsvp.deadline"]}
              hint="After this day the form closes and shows the family's phone number instead."
              onChange={(v) => update(["rsvp", "deadline"], v || undefined)}
            />
            <Toggle label="Ask how many people are coming" checked={rsvp.askGuestCount ?? true} onChange={(v) => update(["rsvp", "askGuestCount"], v)} />
            <Toggle label="Ask about meal preference" checked={rsvp.askMeal ?? false} onChange={(v) => update(["rsvp", "askMeal"], v)} />
          </>
        )}
      </Group>
      <Group title="Other settings">
        <Toggle
          label='Show "Created by Baba Saab Events"'
          description="A small credit at the bottom of the invitation."
          checked={content.showCredit ?? true}
          onChange={(v) => update(["showCredit"], v)}
        />
      </Group>
    </div>
  );
}
```

- [ ] **Step 4: Implement step ⑧ Review**

`src/AdminModule/editor/steps/ReviewStep.jsx`:

```jsx
"use client";

import { cleanDraft } from "@/InvitationModule/schema/draft";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { Group } from "../fields";

export default function ReviewStep({ content, onGoToStep }) {
  const items = publishChecklist(cleanDraft(content).draft ?? {});
  return (
    <div className="space-y-6">
      {items.length > 0 ? (
        <Group title="Still needed before publishing">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-sm">{item.message}</span>
                <button
                  type="button"
                  onClick={() => onGoToStep(item.step)}
                  className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100"
                >
                  Go to step {item.step}
                </button>
              </li>
            ))}
          </ul>
        </Group>
      ) : (
        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Everything needed is filled in.</p>
      )}
      <div>
        <button type="button" disabled className="min-h-[44px] rounded-full bg-stone-900 px-6 text-sm text-white disabled:opacity-40">
          Publish
        </button>
        <p className="mt-2 text-xs text-stone-500">Publishing arrives in the next release. Your draft is saved automatically.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/editor/steps`
Expected: PASS.

- [ ] **Step 6: Run all tests and commit**

```bash
npm test
git add src/AdminModule/editor/steps
git commit -m "feat(editor): add RSVP settings and review checklist steps"
```

---


### Task 9: Auto-save, editor shell, edit page and staff guide

**Files:**
- Create: `src/AdminModule/editor/autosave.js`, `src/AdminModule/editor/autosave.test.js`
- Create: `src/AdminModule/editor/useAutosave.js`, `src/AdminModule/editor/useAutosave.test.jsx`
- Create: `src/AdminModule/editor/useLeaveGuard.js`, `src/AdminModule/editor/useLeaveGuard.test.jsx`
- Create: `src/AdminModule/editor/stepNumber.js`, `src/AdminModule/editor/steps/index.js`, `src/AdminModule/editor/steps/index.test.js`
- Create: `src/AdminModule/editor/SaveStatus.jsx`, `src/AdminModule/editor/StepNav.jsx`, `src/AdminModule/editor/EditorShell.jsx`, `src/AdminModule/editor/EditorShell.test.jsx`
- Create: `src/AdminModule/guideAnchors.js`, `src/AdminModule/guideAnchors.test.js`
- Create: `src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js`, `src/app/(admin)/admin/(staff)/invitations/[id]/edit/not-found.js`
- Modify: `src/app/(admin)/admin/(staff)/help/page.js`, `docs/admin-guide.md`

**Interfaces:**
- Consumes:
  - all eight step components (Tasks 6–8)
  - `setIn` (Task 6), `cleanDraft`, `publishChecklist` (Task 1), `indexFields` (Task 1)
  - `getInvitation`, `saveInvitationAction` (Task 3), `templateChoices()` (Task 5)
- Produces:
  - `autosave.js`:
    - `SAVE_DELAY_MS = 3000`
    - `initialSaveState(version)`
    - `saveReducer(state, action)` with actions `edit | start | success{version,savedAt} | failure{message} | conflict`
    - `hasUnsavedChanges(state)`
    - `statusLabel(state)`
  - `useAutosave({ content, initialVersion, save, delay? }) → { state, retry }`, where `save({ content, expectedVersion })` resolves to a `saveResult` shape.
  - `useLeaveGuard(active) → allowLeave()`
  - `STEP_COUNT`, `stepNumber(raw) → 1..8`
  - `STEPS: { number, title, Component }[]`, `stepHasContent(number, content)`, `guideHref(step)`
  - `slugify(text)`, `textOf(children)`
  - `EditorShell({ invitation: { id, version, content }, initialStep, templates, saveAction })`
  - The `/admin/invitations/[id]/edit` page and its not-found page.

- [ ] **Step 1: Write the failing tests**

`src/AdminModule/editor/autosave.test.js`:

```js
import { describe, expect, it } from "vitest";
import { hasUnsavedChanges, initialSaveState, saveReducer, statusLabel } from "./autosave";

const run = (actions, state = initialSaveState(1)) => actions.reduce(saveReducer, state);

describe("saveReducer", () => {
  it("starts saved", () => {
    expect(initialSaveState(4)).toEqual({ status: "saved", version: 4, savedAt: null, error: null, queued: false });
  });

  it("goes dirty → saving → saved with the new version", () => {
    const state = run([{ type: "edit" }, { type: "start" }, { type: "success", version: 2, savedAt: "2026-10-08T05:12:00.000Z" }]);
    expect(state).toMatchObject({ status: "saved", version: 2, savedAt: "2026-10-08T05:12:00.000Z" });
  });

  it("remembers edits made while a save is in flight, so they are saved next", () => {
    const state = run([{ type: "edit" }, { type: "start" }, { type: "edit" }, { type: "success", version: 2, savedAt: "x" }]);
    expect(state).toMatchObject({ status: "dirty", version: 2, queued: false });
  });

  it("keeps the error message until a save succeeds", () => {
    let state = run([{ type: "edit" }, { type: "start" }, { type: "failure", message: "Couldn't save." }]);
    expect(state).toMatchObject({ status: "error", error: "Couldn't save." });
    state = run([{ type: "edit" }], state);
    expect(state).toMatchObject({ status: "dirty", error: "Couldn't save." });
    state = run([{ type: "start" }, { type: "success", version: 2, savedAt: "x" }], state);
    expect(state.error).toBeNull();
  });

  it("stops at a conflict and ignores further edits", () => {
    const state = run([{ type: "edit" }, { type: "start" }, { type: "conflict" }, { type: "edit" }]);
    expect(state.status).toBe("conflict");
  });
});

describe("hasUnsavedChanges", () => {
  it("is false only when everything is saved", () => {
    expect(hasUnsavedChanges(initialSaveState(1))).toBe(false);
    expect(hasUnsavedChanges(run([{ type: "edit" }]))).toBe(true);
    expect(hasUnsavedChanges(run([{ type: "edit" }, { type: "start" }]))).toBe(true);
  });
});

describe("statusLabel", () => {
  it("describes each state in plain words", () => {
    expect(statusLabel(initialSaveState(1))).toBe("All changes saved");
    expect(statusLabel(run([{ type: "edit" }]))).toBe("Unsaved changes");
    expect(statusLabel(run([{ type: "edit" }, { type: "start" }]))).toBe("Saving…");
    expect(statusLabel(run([{ type: "edit" }, { type: "start" }, { type: "success", version: 2, savedAt: "2026-10-08T05:12:00.000Z" }]))).toBe("Saved 10:42");
    expect(statusLabel(run([{ type: "edit" }, { type: "start" }, { type: "conflict" }]))).toBe("Not saved");
  });
});
```

`src/AdminModule/editor/useAutosave.test.jsx`:

```jsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutosave } from "./useAutosave";

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

const setup = (save) =>
  renderHook(({ content }) => useAutosave({ content, initialVersion: 1, save }), { initialProps: { content: { n: 0 } } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useAutosave", () => {
  it("does not save on load", () => {
    const save = vi.fn();
    setup(save);
    act(() => vi.advanceTimersByTime(10_000));
    expect(save).not.toHaveBeenCalled();
  });

  it("saves the latest content once, 3 seconds after typing stops", async () => {
    const save = vi.fn(async () => ({ ok: true, version: 2, savedAt: "2026-10-08T05:12:00.000Z" }));
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    act(() => vi.advanceTimersByTime(2000));
    rerender({ content: { n: 2 } });
    act(() => vi.advanceTimersByTime(2999));
    expect(save).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ content: { n: 2 }, expectedVersion: 1 });
    expect(result.current.state).toMatchObject({ status: "saved", version: 2 });
  });

  it("saves changes made during a save afterwards, with the new version", async () => {
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({ ok: true, version: 3, savedAt: "x" });
    const { rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    rerender({ content: { n: 2 } });
    await act(async () => first.resolve({ ok: true, version: 2, savedAt: "x" }));
    await act(async () => vi.advanceTimersByTime(3000));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ content: { n: 2 }, expectedVersion: 2 });
  });

  it("keeps the error and saves again on retry", async () => {
    const save = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." }).mockResolvedValueOnce({ ok: true, version: 2, savedAt: "x" });
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(result.current.state).toMatchObject({ status: "error", error: "Couldn't save." });
    await act(async () => result.current.retry());
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.state).toMatchObject({ status: "saved", error: null });
  });

  it("treats a thrown error as a failed save", async () => {
    const save = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(result.current.state.status).toBe("error");
  });

  it("stops saving after a conflict", async () => {
    const save = vi.fn().mockResolvedValueOnce({ ok: false, conflict: true });
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    rerender({ content: { n: 2 } });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("conflict");
  });
});
```

`src/AdminModule/editor/useLeaveGuard.test.jsx`:

```jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useLeaveGuard } from "./useLeaveGuard";

function Page({ active }) {
  useLeaveGuard(active);
  return (
    <>
      <a href="/admin/invitations">All invitations</a>
      <a href="/admin/help#x" target="_blank" rel="noreferrer">Help</a>
    </>
  );
}

/**
 * Clicks a link and reports whether the click got past the guard to the page. The helper then
 * cancels the click itself, because jsdom can't navigate and would log an error.
 */
function click(link) {
  let reachedPage = false;
  const onPage = (event) => {
    reachedPage = !event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", onPage);
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  document.removeEventListener("click", onPage);
  return reachedPage;
}

afterEach(() => vi.restoreAllMocks());

describe("useLeaveGuard", () => {
  it("asks before following a link while there are unsaved changes", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Page active />);
    expect(click(screen.getByText("All invitations"))).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });

  it("lets the link through when confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Page active />);
    expect(click(screen.getByText("All invitations"))).toBe(true);
  });

  it("never asks for links that open in a new tab, or when everything is saved", () => {
    const confirm = vi.spyOn(window, "confirm");
    const { rerender } = render(<Page active />);
    click(screen.getByText("Help"));
    rerender(<Page active={false} />);
    click(screen.getByText("All invitations"));
    expect(confirm).not.toHaveBeenCalled();
  });

  it("warns before closing the tab", () => {
    render(<Page active />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
```

`src/AdminModule/guideAnchors.test.js`:

```js
import { describe, expect, it } from "vitest";
import { slugify, textOf } from "./guideAnchors";

describe("slugify", () => {
  it("turns a heading into a URL-safe anchor", () => {
    expect(slugify("Editor step 1: Template & palette")).toBe("editor-step-1-template-palette");
    expect(slugify("Managing staff (owner only)")).toBe("managing-staff-owner-only");
  });
});

describe("textOf", () => {
  it("flattens React children to text", () => {
    expect(textOf(["Editor step ", 2, ": ", { props: { children: "Couple" } }])).toBe("Editor step 2: Couple");
  });
});
```

`src/AdminModule/editor/steps/index.test.js`:

```js
import { describe, expect, it } from "vitest";
import { guideHref, STEPS, stepHasContent } from "./index";
import { stepNumber } from "../stepNumber";

describe("STEPS", () => {
  it("has the eight editor steps in order", () => {
    expect(STEPS.map((s) => s.title)).toEqual([
      "Template & palette",
      "Couple & families",
      "Date, venue & travel",
      "Events",
      "Photos, film & music",
      "Sections",
      "RSVP & settings",
      "Review",
    ]);
  });

  it("links each step to its guide section", () => {
    expect(guideHref(STEPS[2])).toBe("/admin/help#editor-step-3-date-venue-travel");
  });
});

describe("stepNumber", () => {
  it("accepts 1–8 and falls back to 1", () => {
    expect(stepNumber("4")).toBe(4);
    expect(stepNumber("9")).toBe(1);
    expect(stepNumber(undefined)).toBe(1);
    expect(stepNumber("two")).toBe(1);
  });
});

describe("stepHasContent", () => {
  it("ticks steps that have something filled in", () => {
    const content = { templateId: "royal", theme: { palette: "maroon-gold" }, couple: { groom: { name: { en: "Rahul" } } } };
    expect(stepHasContent(1, content)).toBe(true);
    expect(stepHasContent(2, content)).toBe(true);
    expect(stepHasContent(3, content)).toBe(false);
    expect(stepHasContent(4, { events: [{ id: "a" }] })).toBe(true);
    expect(stepHasContent(8, content)).toBe(false);
  });
});
```

`src/AdminModule/editor/EditorShell.test.jsx`:

```jsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import EditorShell from "./EditorShell";
import { TEMPLATE_CHOICES } from "./test-utils";

const invitation = {
  id: "inv-1",
  version: 5,
  content: { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" },
};

const renderShell = (saveAction, initialStep = 2) =>
  render(<EditorShell invitation={invitation} initialStep={initialStep} templates={TEMPLATE_CHOICES} saveAction={saveAction} />);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("EditorShell", () => {
  it("opens on the requested step and moves between steps", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("heading", { name: "2. Couple & families" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "3. Date, venue & travel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /8\. Review/ }));
    expect(screen.getByRole("heading", { name: "8. Review" })).toBeInTheDocument();
    expect(window.location.search).toContain("step=8");
  });

  it("auto-saves edits with the invitation id and version", async () => {
    const saveAction = vi.fn(async () => ({ ok: true, version: 6, savedAt: "2026-10-08T05:12:00.000Z" }));
    renderShell(saveAction);
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(saveAction).toHaveBeenCalledWith({
      id: "inv-1",
      expectedVersion: 5,
      content: { ...invitation.content, couple: { bride: { name: { en: "Priya" } } } },
    });
    expect(screen.getByText("Saved 10:42")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Priya");
  });

  it("shows a Retry banner when saving fails", async () => {
    const saveAction = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." }).mockResolvedValueOnce({ ok: true, version: 6, savedAt: "x" });
    renderShell(saveAction);
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(saveAction).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells staff when someone else saved first", async () => {
    renderShell(vi.fn(async () => ({ ok: false, conflict: true })));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("links each step to its help section", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("link", { name: /Help for this step/ })).toHaveAttribute("href", "/admin/help#editor-step-2-couple-families");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/editor src/AdminModule/guideAnchors.test.js`
Expected: FAIL. The new modules can't be resolved. The Tasks 6–8 step tests still pass.

- [ ] **Step 3: Implement the auto-save state**

`src/AdminModule/editor/autosave.js`:

```js
export const SAVE_DELAY_MS = 3000;

export function initialSaveState(version) {
  return { status: "saved", version, savedAt: null, error: null, queued: false };
}

/**
 * saved → (edit) dirty → (start) saving → (success) saved | (failure) error | (conflict) conflict.
 * Edits during a save set `queued`, so the next save picks them up. A failure's message stays
 * until a save succeeds. A conflict is final: nothing more is saved until the page reloads.
 */
export function saveReducer(state, action) {
  switch (action.type) {
    case "edit":
      if (state.status === "conflict") return state;
      if (state.status === "saving") return { ...state, queued: true };
      return { ...state, status: "dirty" };
    case "start":
      return { ...state, status: "saving", queued: false };
    case "success":
      return { ...state, status: state.queued ? "dirty" : "saved", version: action.version, savedAt: action.savedAt, error: null, queued: false };
    case "failure":
      return { ...state, status: "error", error: action.message, queued: false };
    case "conflict":
      return { ...state, status: "conflict", queued: false };
    default:
      return state;
  }
}

export const hasUnsavedChanges = (state) => state.status !== "saved";

const savedTime = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

export function statusLabel(state) {
  switch (state.status) {
    case "saving":
      return "Saving…";
    case "saved":
      return state.savedAt ? `Saved ${savedTime.format(new Date(state.savedAt))}` : "All changes saved";
    case "conflict":
      return "Not saved";
    default:
      return "Unsaved changes";
  }
}
```

- [ ] **Step 4: Implement the auto-save hook**

`src/AdminModule/editor/useAutosave.js`:

```js
"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialSaveState, SAVE_DELAY_MS, saveReducer } from "./autosave";

const FAILED = "Couldn't save. Check your connection and try again.";

/** Saves `content` SAVE_DELAY_MS after the last change, one save at a time, always with the latest version. */
export function useAutosave({ content, initialVersion, save, delay = SAVE_DELAY_MS }) {
  const [state, dispatch] = useReducer(saveReducer, initialVersion, initialSaveState);
  const latest = useRef({ content, version: initialVersion });
  latest.current.content = content;
  latest.current.version = state.version;
  const initialContent = useRef(content);
  const inFlight = useRef(false);

  useEffect(() => {
    // Compared by identity so React's double-run of effects in development never marks a fresh page dirty.
    if (content !== initialContent.current) dispatch({ type: "edit" });
  }, [content]);

  const runSave = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "start" });
    let result;
    try {
      result = await save({ content: latest.current.content, expectedVersion: latest.current.version });
    } catch {
      result = { ok: false, message: FAILED };
    }
    inFlight.current = false;
    if (result?.ok) dispatch({ type: "success", version: result.version, savedAt: result.savedAt });
    else if (result?.conflict) dispatch({ type: "conflict" });
    else dispatch({ type: "failure", message: result?.message ?? FAILED });
  }, [save]);

  useEffect(() => {
    if (state.status !== "dirty") return undefined;
    const timer = setTimeout(runSave, delay);
    return () => clearTimeout(timer);
  }, [state.status, content, delay, runSave]);

  const retry = useCallback(() => {
    if (state.status === "error" || state.status === "dirty") return runSave();
    return undefined;
  }, [state.status, runSave]);

  return { state, retry };
}
```

- [ ] **Step 5: Implement the leave guard**

`src/AdminModule/editor/useLeaveGuard.js`:

```js
"use client";

import { useCallback, useEffect, useRef } from "react";

export const LEAVE_MESSAGE = "You have unsaved changes. Leave this page anyway?";

/** While `active`, asks before closing the tab or following a link to another page. */
export function useLeaveGuard(active) {
  const allowed = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    allowed.current = false;

    const onBeforeUnload = (event) => {
      if (allowed.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event) => {
      if (allowed.current || event.defaultPrevented) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);

  // For deliberate exits such as "Reload": stops the guard immediately, before React re-renders.
  return useCallback(() => {
    allowed.current = true;
  }, []);
}
```

- [ ] **Step 6: Implement guide anchors and the step registry**

`src/AdminModule/guideAnchors.js`:

```js
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Plain text of React children (strings, numbers, arrays, elements). */
export function textOf(children) {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOf).join("");
  if (children?.props) return textOf(children.props.children);
  return "";
}
```

`src/AdminModule/editor/stepNumber.js`:

```js
export const STEP_COUNT = 8;

export function stepNumber(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= STEP_COUNT ? n : 1;
}
```

`src/AdminModule/editor/steps/index.js`:

```js
import { hasText } from "@/InvitationModule/lib/i18n";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { slugify } from "../../guideAnchors";
import TemplateStep from "./TemplateStep";
import CoupleStep from "./CoupleStep";
import VenueStep from "./VenueStep";
import EventsStep from "./EventsStep";
import MediaStep from "./MediaStep";
import SectionsStep from "./SectionsStep";
import RsvpStep from "./RsvpStep";
import ReviewStep from "./ReviewStep";

export const STEPS = [
  { number: 1, title: "Template & palette", Component: TemplateStep },
  { number: 2, title: "Couple & families", Component: CoupleStep },
  { number: 3, title: "Date, venue & travel", Component: VenueStep },
  { number: 4, title: "Events", Component: EventsStep },
  { number: 5, title: "Photos, film & music", Component: MediaStep },
  { number: 6, title: "Sections", Component: SectionsStep },
  { number: 7, title: "RSVP & settings", Component: RsvpStep },
  { number: 8, title: "Review", Component: ReviewStep },
];

/** Must match the "## Editor step N: Title" headings in docs/admin-guide.md. */
export const guideHref = (step) => `/admin/help#${slugify(`Editor step ${step.number}: ${step.title}`)}`;

export function stepHasContent(number, content) {
  switch (number) {
    case 1:
      return Boolean(content.templateId && content.theme?.palette);
    case 2:
      return hasText(content.couple?.bride?.name) || hasText(content.couple?.groom?.name);
    case 3:
      return Boolean(content.mainDate) || hasText(content.venue?.name);
    case 4:
      return (content.events ?? []).length > 0;
    case 5:
      return Boolean(content.media?.film?.url);
    case 6:
      return (content.theme?.hidden ?? []).length > 0 || (content.theme?.sectionOrder ?? []).length > 0;
    case 7:
      return Boolean(content.rsvp?.enabled);
    case 8:
      return publishChecklist(cleanDraft(content).draft ?? {}).length === 0;
    default:
      return false;
  }
}
```

- [ ] **Step 7: Implement the status, step list and shell**

`src/AdminModule/editor/SaveStatus.jsx`:

```jsx
"use client";

import { statusLabel } from "./autosave";

const bannerButton = "min-h-[44px] rounded-full border border-current px-4 text-sm";

export default function SaveStatus({ state }) {
  return (
    <p aria-live="polite" className="text-sm text-stone-600">
      {statusLabel(state)}
    </p>
  );
}

export function SaveBanners({ state, onRetry, onReload }) {
  if (state.status === "conflict") {
    return (
      <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="flex-1">Updated by someone else — reload to see their changes. Your latest edits here were not saved.</span>
        <button type="button" onClick={onReload} className={bannerButton}>
          Reload
        </button>
      </div>
    );
  }
  if (state.error) {
    return (
      <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <span className="flex-1">Couldn&apos;t save — your changes are still here. {state.error}</span>
        <button type="button" onClick={onRetry} disabled={state.status === "saving"} className={bannerButton}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}
```

`src/AdminModule/editor/StepNav.jsx`:

```jsx
"use client";

import { STEPS, stepHasContent } from "./steps";

export default function StepNav({ current, content, onSelect }) {
  return (
    <nav aria-label="Editor steps">
      <ol className="flex gap-1 overflow-x-auto lg:flex-col">
        {STEPS.map((step) => {
          const active = step.number === current;
          const done = stepHasContent(step.number, content);
          return (
            <li key={step.number}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step.number)}
                className={`flex min-h-[44px] w-full items-center gap-2 whitespace-nowrap rounded-md px-3 text-left text-sm ${active ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
              >
                <span aria-hidden="true" className="w-4 text-center">
                  {done ? "✓" : ""}
                </span>
                {step.number}. {step.title}
                {done && <span className="sr-only"> (has details)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

`src/AdminModule/editor/EditorShell.jsx`:

```jsx
"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { hasUnsavedChanges } from "./autosave";
import { setIn } from "./paths";
import SaveStatus, { SaveBanners } from "./SaveStatus";
import StepNav from "./StepNav";
import { guideHref, STEPS } from "./steps";
import { useAutosave } from "./useAutosave";
import { useLeaveGuard } from "./useLeaveGuard";

const navButton = "min-h-[44px] rounded-full border border-stone-300 px-5 text-sm hover:bg-stone-100";

export default function EditorShell({ invitation, initialStep, templates, saveAction }) {
  const [content, setContent] = useState(invitation.content);
  const [step, setStep] = useState(initialStep);

  const save = useCallback(
    ({ content: latest, expectedVersion }) => saveAction({ id: invitation.id, expectedVersion, content: latest }),
    [saveAction, invitation.id],
  );
  const { state, retry } = useAutosave({ content, initialVersion: invitation.version, save });
  const allowLeave = useLeaveGuard(hasUnsavedChanges(state));

  const update = useCallback((path, value) => setContent((c) => setIn(c, path, value)), []);
  const { errors } = useMemo(() => cleanDraft(content), [content]);

  const goTo = useCallback((n) => {
    setStep(n);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(n));
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const reload = () => {
    allowLeave();
    window.location.reload();
  };

  const current = STEPS[step - 1];
  const Step = current.Component;
  const title = indexFields(content).coupleNames;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/invitations" className="text-sm text-stone-600 hover:underline">
            ← All invitations
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        </div>
        <SaveStatus state={state} />
      </div>
      <SaveBanners state={state} onRetry={retry} onReload={reload} />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <StepNav current={step} content={content} onSelect={goTo} />
        </aside>

        <section className="min-w-0 flex-1" aria-labelledby="step-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="step-title" className="text-xl font-semibold">
              {current.number}. {current.title}
            </h2>
            <a href={guideHref(current)} target="_blank" rel="noopener noreferrer" className="text-sm underline">
              ? Help for this step
            </a>
          </div>
          <div className="mt-4">
            <Step content={content} update={update} errors={errors} language={content.language ?? "en"} templates={templates} onGoToStep={goTo} />
          </div>
          <div className="mt-8 flex justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => goTo(step - 1)} className={navButton}>
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length && (
              <button type="button" onClick={() => goTo(step + 1)} className={navButton}>
                Next →
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add the edit page, not-found page and help anchors**

`src/app/(admin)/admin/(staff)/invitations/[id]/edit/page.js`:

```js
import { notFound } from "next/navigation";
import { requireStaff } from "@/AdminModule/auth/server";
import { saveInvitationAction } from "@/AdminModule/invitations/actions";
import { getInvitation } from "@/AdminModule/invitations/data";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";
import EditorShell from "@/AdminModule/editor/EditorShell";
import { stepNumber } from "@/AdminModule/editor/stepNumber";

export const metadata = { title: "Edit invitation · Baba Saab Admin" };

export default async function EditInvitationPage({ params, searchParams }) {
  await requireStaff();
  const invitation = await getInvitation(params.id);
  if (!invitation) notFound();
  return (
    <EditorShell
      invitation={invitation}
      initialStep={stepNumber(searchParams?.step)}
      templates={templateChoices()}
      saveAction={saveInvitationAction}
    />
  );
}
```

`src/app/(admin)/admin/(staff)/invitations/[id]/edit/not-found.js`:

```js
import Link from "next/link";

export default function InvitationNotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">This invitation doesn&apos;t exist</h1>
      <p className="mt-2 text-stone-600">It may have been deleted, or the link may be wrong.</p>
      <Link href="/admin/invitations" className="mt-4 inline-flex min-h-[44px] items-center underline">
        Back to all invitations
      </Link>
    </div>
  );
}
```

`src/app/(admin)/admin/(staff)/help/page.js`:
- Add `import { slugify, textOf } from "@/AdminModule/guideAnchors";`.
- Pass `components` to `Markdown` so each `##` heading gets an id that "?" links can jump to:

```jsx
      <Markdown remarkPlugins={[remarkGfm]} components={{ h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2> }}>
        {guide}
      </Markdown>
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/editor src/AdminModule/guideAnchors.test.js`
Expected: PASS.

- [ ] **Step 10: Update the staff guide**

`docs/admin-guide.md`: insert directly after the `## Creating an invitation` section. The headings must stay exactly `## Editor step N: <step title>`, because the "?" links point at them.

```markdown
## Editing an invitation

The editor has three parts: the **steps** on the left, the **form** in the middle and a **live phone preview** on the right (on a phone, tap **Preview**).

- Do the steps in any order. A **✓** appears next to each step that has details filled in.
- **Saving is automatic.** About 3 seconds after you stop typing, the top right says **Saving…** and then **Saved** with the time.
- **"Couldn't save" banner:** your changes are still on the screen. Check the internet connection and click **Retry**. Don't close the page until it says **Saved**.
- **"Updated by someone else" banner:** another staff member saved this invitation while you had it open. Click **Reload** to see their version, then make your changes again. This stops two people overwriting each other.
- If you try to leave with unsaved changes, the page asks you first.
- Click **? Help for this step** to jump to that step's section of this guide.

## Editor step 1: Template & palette

Change the design, colour palette or language at any time. Nothing you've typed is lost. If you switch from **Both** to English, the Hindi text is kept, and it comes back if you switch to **Both** again.

## Editor step 2: Couple & families

- **Bride and groom:** names, and the parents line, for example "D/o Smt. Sunita & Shri Rajesh Sharma".
- **Blessing at the top:** the symbol (Shri Ganesh, Om or none) and a shloka. Pick one of the ready-made shlokas, or choose **Our own text** and type the family's own.
- **Families:** add each family's name for the closing message. **Closing line** is the sign-off, for example "With love and blessings from the Sharma and Mehra families".
- **Family contact phone:** shown to guests once RSVPs close. Search on the Invitations page also finds invitations by this number.

For a **Both** invitation, each field has an English box and a Hindi box.

## Editor step 3: Date, venue & travel

- **Main wedding date:** drives the countdown and the save-the-date.
- **Venue name and address.**
- **Google Maps link:** open the venue in Google Maps, tap **Share**, copy the link and paste it. It must start with `https://`.
- **Travel notes:** nearest airport and railway station, weather tips. Put one point per line.

## Editor step 4: Events

Add each function guests are invited to. The quick buttons (**+ Haldi**, **+ Mehendi**, **+ Sangeet**, **+ Vivah**, **+ Reception**) fill in the name in English and Hindi. Use **+ Other event** for anything else. Give every event a date and time. Add a different venue, dress code or description only where it applies. Use **Move up** and **Move down** to change the order.

## Editor step 5: Photos, film & music

Paste the invitation film's **YouTube link**. The film can be "unlisted" on YouTube. Uploading photos and music is coming in the next release.

## Editor step 6: Sections

Choose which parts of the invitation guests see, and in what order. Untick **Show** to hide a section, and use the arrows to move it. The cover always comes first. A section with nothing filled in is hidden automatically, so you only need to hide sections you've filled in but don't want shown.

## Editor step 7: RSVP & settings

- Tick **Ask guests to RSVP** to add the RSVP form, then set the **Last day to RSVP**. After that day the form closes and shows the family's phone number.
- Choose whether to ask **how many people are coming** and about **meal preference**.
- **Show "Created by Baba Saab Events"** adds a small credit at the bottom. Untick it if the customer prefers.

## Editor step 8: Review

This step lists everything still needed before the invitation can be published, such as a missing date or an event without a time. Click **Go to step N** to fix each one. Publishing arrives in the next release. Until then, everything is saved as a draft.
```

- [ ] **Step 11: Run all tests, build and commit**

```bash
npm test
npx next build
git add src/AdminModule/editor src/AdminModule/guideAnchors.js src/AdminModule/guideAnchors.test.js "src/app/(admin)/admin/(staff)/invitations/[id]" "src/app/(admin)/admin/(staff)/help/page.js" docs/admin-guide.md
git commit -m "feat(editor): add editor shell with auto-save, conflict and leave guards"
```

Expected: tests pass; the build lists `/admin/invitations/[id]/edit`.

---


### Task 10: Live phone preview

**Files:**
- Create: `src/AdminModule/editor/previewMessages.js`
- Create: `src/AdminModule/editor/PreviewFrameClient.jsx`, `src/AdminModule/editor/PreviewFrameClient.test.jsx`
- Create: `src/AdminModule/editor/PreviewPane.jsx`, `src/AdminModule/editor/PreviewPane.test.jsx`
- Create: `src/app/(admin)/admin/preview-frame/page.js`
- Create: `src/InvitationModule/templates/base/TemplateFrame.test.jsx`
- Modify: `src/InvitationModule/templates/base/TemplateFrame.jsx`, `src/AdminModule/PhoneFrame.jsx`, `src/AdminModule/editor/EditorShell.jsx`, `src/AdminModule/editor/EditorShell.test.jsx`

**Interfaces:**
- Consumes:
  - `cleanDraft`, `previewInvitation` (Task 1)
  - `InvitationRenderer({ invitation, ctx })`, `getTemplate`
  - `chipClass` (Task 4), `requireStaff`
  - `EditorShell` (Task 9)
- Produces:
  - `PREVIEW_MESSAGE = "invitation-preview"` (editor → frame, payload `{ type, content, lang: "en" | "hi" | null }`).
  - `READY_MESSAGE = "invitation-preview-ready"` (frame → editor).
  - `ctx.skipOpening` for templates: no opening overlay.
  - `PhoneFrame` gains `iframeRef` and `lazy = true` props.
  - `PreviewPane({ content, scale? })`, `READY_TIMEOUT_MS`.
  - `PreviewFrameClient()`.
  - The staff-only `/admin/preview-frame` page, with no admin shell.

- [ ] **Step 1: Write the failing tests**

`src/InvitationModule/templates/base/TemplateFrame.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InvitationRenderer from "../../InvitationRenderer";
import { parseInvitation } from "../../schema/invitation";
import { getTemplate } from "../registry";

const invitation = parseInvitation(getTemplate("royal").sample);

describe("TemplateFrame opening", () => {
  it("shows the opening cover to guests", () => {
    render(<InvitationRenderer invitation={invitation} />);
    expect(screen.getByRole("dialog", { name: "Invitation cover" })).toBeInTheDocument();
  });

  it("skips the opening cover in the editor preview", () => {
    render(<InvitationRenderer invitation={invitation} ctx={{ mode: "preview", skipOpening: true }} />);
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).not.toBeInTheDocument();
  });
});
```

`src/AdminModule/editor/PreviewFrameClient.test.jsx`:

```jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import PreviewFrameClient from "./PreviewFrameClient";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

const BANNER = "Sample details shown where you haven't filled in yet";

function send(data, origin = window.location.origin) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }));
  });
}

afterEach(() => vi.restoreAllMocks());

describe("PreviewFrameClient", () => {
  it("tells the editor it is ready", () => {
    const post = vi.spyOn(window, "postMessage");
    render(<PreviewFrameClient />);
    expect(post).toHaveBeenCalledWith({ type: READY_MESSAGE }, window.location.origin);
  });

  it("renders a brand-new draft with sample details, without the opening cover", () => {
    render(<PreviewFrameClient />);
    send({ type: PREVIEW_MESSAGE, content: { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" }, lang: null });
    expect(screen.getByText(BANNER)).toBeInTheDocument();
    expect(screen.getAllByText("Aarohi").length).toBeGreaterThan(0);
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).not.toBeInTheDocument();
  });

  it("shows the couple's own details once they are filled in", () => {
    render(<PreviewFrameClient />);
    send({
      type: PREVIEW_MESSAGE,
      content: {
        templateId: "royal",
        theme: { palette: "maroon-gold" },
        language: "both",
        couple: { bride: { name: { en: "Priya", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
        mainDate: "2027-02-14",
        venue: { name: { en: "Riviera", hi: "रिवेरा" } },
      },
      lang: "hi",
    });
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    expect(screen.getAllByText("प्रिया").length).toBeGreaterThan(0);
    expect(screen.queryByText("Priya")).not.toBeInTheDocument();
  });

  it("ignores messages from other sites", () => {
    render(<PreviewFrameClient />);
    send({ type: PREVIEW_MESSAGE, content: { templateId: "royal", theme: { palette: "maroon-gold" } }, lang: null }, "https://evil.example");
    expect(screen.getByText("Loading preview…")).toBeInTheDocument();
  });
});
```

`src/AdminModule/editor/PreviewPane.test.jsx`:

```jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import PreviewPane, { READY_TIMEOUT_MS } from "./PreviewPane";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

const content = { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" };

function frameReady(iframe) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: READY_MESSAGE }, origin: window.location.origin, source: iframe.contentWindow }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PreviewPane", () => {
  it("sends the draft once the frame is ready, and again on every change", () => {
    const { rerender } = render(<PreviewPane content={content} />);
    const iframe = screen.getByTitle("Live preview");
    expect(iframe).toHaveAttribute("src", "/admin/preview-frame");
    const post = vi.spyOn(iframe.contentWindow, "postMessage");
    frameReady(iframe);
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content, lang: null }, window.location.origin);
    const next = { ...content, mainDate: "2027-02-14" };
    rerender(<PreviewPane content={next} />);
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content: next, lang: null }, window.location.origin);
  });

  it("offers a language switch only for bilingual invitations", () => {
    const { rerender } = render(<PreviewPane content={content} />);
    expect(screen.queryByRole("group", { name: "Preview language" })).not.toBeInTheDocument();
    const both = { ...content, language: "both" };
    rerender(<PreviewPane content={both} />);
    const iframe = screen.getByTitle("Live preview");
    const post = vi.spyOn(iframe.contentWindow, "postMessage");
    frameReady(iframe);
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content: both, lang: "hi" }, window.location.origin);
  });

  it("says when the preview can't load", () => {
    vi.useFakeTimers();
    render(<PreviewPane content={content} />);
    act(() => vi.advanceTimersByTime(READY_TIMEOUT_MS));
    expect(screen.getByRole("alert")).toHaveTextContent("Preview unavailable — reload the page.");
  });
});
```

In `src/AdminModule/editor/EditorShell.test.jsx`, add:

```jsx
  it("shows the live preview", () => {
    renderShell(vi.fn());
    expect(screen.getByTitle("Live preview")).toHaveAttribute("src", "/admin/preview-frame");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/InvitationModule/templates/base/TemplateFrame.test.jsx src/AdminModule/editor/PreviewFrameClient.test.jsx src/AdminModule/editor/PreviewPane.test.jsx src/AdminModule/editor/EditorShell.test.jsx`
Expected: FAIL. The "skips the opening cover" test fails, the new modules can't be resolved, and the shell has no preview yet.

- [ ] **Step 3: Let templates skip the opening cover**

In `src/InvitationModule/templates/base/TemplateFrame.jsx`, wrap the existing `<OpeningOverlay ...>...</OpeningOverlay>` element so it renders only when `!ctx.skipOpening`:

```jsx
      {!ctx.skipOpening && (
        <OpeningOverlay className={s.opening} closingClassName={s.openingClosing} onOpen={music.play}>
          {(open) => <Opening inv={inv} lang={lang} s={s} open={open} />}
        </OpeningOverlay>
      )}
```

- [ ] **Step 4: Give PhoneFrame a ref and an eager option**

`src/AdminModule/PhoneFrame.jsx`: change the signature to `export default function PhoneFrame({ src, title, scale = 0.6, iframeRef, lazy = true })`, and on the `<iframe>` replace `loading="lazy"` with:

```jsx
          ref={iframeRef}
          loading={lazy ? "lazy" : undefined}
```

- [ ] **Step 5: Implement the frame side**

`src/AdminModule/editor/previewMessages.js`:

```js
// postMessage types between the editor (parent) and /admin/preview-frame (iframe). Same origin only.
export const PREVIEW_MESSAGE = "invitation-preview";
export const READY_MESSAGE = "invitation-preview-ready";
```

`src/AdminModule/editor/PreviewFrameClient.jsx`:

```jsx
"use client";

import { useEffect, useState } from "react";
import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import { previewInvitation } from "@/InvitationModule/lib/preview";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { getTemplate } from "@/InvitationModule/templates/registry";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

/** Runs inside the editor's preview iframe: renders whatever draft the editor sends, exactly as guests would see it. */
export default function PreviewFrameClient() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const origin = window.location.origin;
    const onMessage = (event) => {
      if (event.origin === origin && event.data?.type === PREVIEW_MESSAGE) setMessage(event.data);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: READY_MESSAGE }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!message) return <p className="p-6 text-center text-sm text-stone-500">Loading preview…</p>;

  const draft = cleanDraft(message.content).draft;
  const template = draft && getTemplate(draft.templateId);
  if (!template) return <p className="p-6 text-center text-sm text-stone-500">Choose a design to see the preview.</p>;

  const { invitation, usedSample } = previewInvitation(draft, template);
  const shown = message.lang ? { ...invitation, language: message.lang } : invitation;
  return (
    <>
      {usedSample && (
        <p className="sticky top-0 z-50 bg-amber-100 px-3 py-2 text-center text-xs text-amber-900">
          Sample details shown where you haven&apos;t filled in yet
        </p>
      )}
      <InvitationRenderer invitation={shown} ctx={{ mode: "preview", skipOpening: true }} />
    </>
  );
}
```

`src/app/(admin)/admin/preview-frame/page.js`:

```js
import { requireStaff } from "@/AdminModule/auth/server";
import PreviewFrameClient from "@/AdminModule/editor/PreviewFrameClient";

export const metadata = { title: "Preview" };

// Staff-only and outside the (staff) group on purpose: no admin shell, so template styles render in isolation.
export default async function PreviewFramePage() {
  await requireStaff();
  return <PreviewFrameClient />;
}
```

- [ ] **Step 6: Implement the editor side**

`src/AdminModule/editor/PreviewPane.jsx`:

```jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhoneFrame from "../PhoneFrame";
import { chipClass } from "../ui";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

export const READY_TIMEOUT_MS = 15_000;

const PREVIEW_LANGUAGES = [
  { id: null, label: "Both" },
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
];

export default function PreviewPane({ content, scale = 0.62 }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lang, setLang] = useState(null);
  const bilingual = content.language === "both";

  const post = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, content, lang: bilingual ? lang : null }, window.location.origin);
  }, [content, lang, bilingual]);
  const postRef = useRef(post);
  postRef.current = post;

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== READY_MESSAGE) return;
      setReady(true);
      setFailed(false);
      // The frame (re)loaded: send it the current draft straight away.
      postRef.current();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (ready) post();
  }, [ready, post]);

  useEffect(() => {
    if (ready) return undefined;
    const timer = setTimeout(() => setFailed(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <div className="flex flex-col items-center gap-3">
      {bilingual && (
        <div role="group" aria-label="Preview language" className="flex flex-wrap justify-center gap-2">
          {PREVIEW_LANGUAGES.map((option) => (
            <button key={option.label} type="button" aria-pressed={lang === option.id} onClick={() => setLang(option.id)} className={chipClass(lang === option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      )}
      {failed ? (
        <p role="alert" className="rounded-xl border border-stone-300 bg-white p-4 text-sm text-stone-700">
          Preview unavailable — reload the page.
        </p>
      ) : (
        <PhoneFrame src="/admin/preview-frame" title="Live preview" scale={scale} iframeRef={frame} lazy={false} />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Put the preview in the editor**

In `src/AdminModule/editor/EditorShell.jsx`:
- Add `import PreviewPane from "./PreviewPane";`.
- Add `const [showPreview, setShowPreview] = useState(false);` beside the other state.
- In the header row, put this button right before `<SaveStatus state={state} />`. It only shows below `lg`.

```jsx
        <button
          type="button"
          aria-expanded={showPreview}
          onClick={() => setShowPreview((v) => !v)}
          className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm lg:hidden"
        >
          {showPreview ? "Hide preview" : "Preview"}
        </button>
```

- Add a third column after the step `<section>`, inside the same `flex` container. There is one preview: it is hidden on small screens unless toggled, and always shown from `lg`.

```jsx
        <aside aria-label="Live preview" className={`${showPreview ? "block" : "hidden"} lg:block lg:w-[262px] lg:shrink-0`}>
          <div className="lg:sticky lg:top-4">
            <PreviewPane content={content} />
          </div>
        </aside>
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/InvitationModule src/AdminModule/editor`
Expected: PASS, including every existing template test.

- [ ] **Step 9: Run all tests, build, check the preview route and commit**

```bash
npm test
npx next build
```

With `npm run dev` running, in a second terminal:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/admin/preview-frame
```

Expected:
- Tests pass, and the build lists `/admin/preview-frame`.
- Signed out, curl returns `307` to `/admin/login?next=%2Fadmin%2Fpreview-frame`, so the frame is staff-only.

Stop the server, then commit:

```bash
git add src/AdminModule/editor src/AdminModule/PhoneFrame.jsx src/InvitationModule/templates/base "src/app/(admin)/admin/preview-frame"
git commit -m "feat(editor): add live phone preview of the draft"
```

---

### Task 11: Verify on the sandbox and hand off

**Files:** none created. This task proves the phase works end to end against real AWS.

**Interfaces:**
- Consumes: everything above. The sandbox backend from Task 2 must be deployed, and `amplify_outputs.json` must be the real sandbox output.
- Produces: a green suite, a clean build, a manual QA record, and a branch ready for the owner to push.

- [ ] **Step 1: Full test run and build**

```bash
npm test
npx tsc --noEmit -p amplify/tsconfig.json
rm -rf .next && npx next build
```

Expected: every test passes, `tsc` is clean, and the build lists `/admin/invitations`, `/admin/invitations/new`, `/admin/invitations/[id]/edit` and `/admin/preview-frame`.

- [ ] **Step 2: Make sure the sandbox has the latest backend**

```bash
npx ampx sandbox --once
```

Expected: `Deployment completed` (no changes, or the Task 2 resources).

- [ ] **Step 3: Manual QA with the owner (signed in as staff on `npm run dev`)**

Start the dev server **after** the sandbox deploy, so it loads the real `amplify_outputs.json`. Record each result in the report.

- [ ] **Create:** Invitations → New invitation → Floral Pastel, second palette, **Both** → Create. The editor opens on step 2, and the status reads "All changes saved".
- [ ] **Type and save:** in step ②, enter both names in English and Hindi. The status shows "Unsaved changes", then "Saving…", then "Saved HH:mm". The title at the top changes to the names.
- [ ] **Reload persists:** reload the page. Everything typed is still there. This proves the `content` JSON round-trips through AppSync and DynamoDB.
- [ ] **All steps:** fill steps ③–⑦, including two events from the quick buttons, a YouTube link, one hidden section and RSVP on. Each step gets a ✓. Step ⑧ lists only what's genuinely missing, and **Go to step N** jumps correctly.
- [ ] **Bad values:** enter Maps link `maps.google.com/x`. The hint appears and the other fields still save (check "Saved"). Fix it and the hint goes away.
- [ ] **Language safety:** step ① → English. The Hindi boxes disappear. Switch back to **Both** and the Hindi text is still there.
- [ ] **Live preview:**
  - The phone preview updates as you type, with no opening animation.
  - The "Sample details shown" banner appears on a brand-new invitation and disappears once names, date and venue are filled in.
  - The EN / हिंदी / Both switch works.
  - Switch through all 4 designs in step ①.
- [ ] **Conflict:** open the same invitation in two tabs. Edit in tab A and wait for "Saved", then edit in tab B. Tab B shows "Updated by someone else — reload", and **Reload** shows tab A's change without a leave prompt.
- [ ] **Offline:** DevTools → Network → Offline, then type. "Couldn't save — your changes are still here" appears with **Retry**. Clicking **All invitations** asks to confirm. Go back online and click **Retry**: it shows "Saved".
- [ ] **List:** the invitation appears in Invitations with names, design, date, Draft and "Edited … by <email>". Search by a Hindi name and by the phone number. The status filter works.
- [ ] **Unknown id:** `/admin/invitations/does-not-exist/edit` shows "This invitation doesn't exist".
- [ ] **Mobile:** at 360px width, the steps scroll sideways and **Preview** toggles the phone. There is no sideways page scroll.
- [ ] **Help:** each step's "? Help for this step" opens the guide at that step's section.
- [ ] **Signed out:** in a private window, `/admin/invitations` and `/admin/preview-frame` redirect to sign-in.

Fix anything that fails (with a test where the fault is in tested code) before continuing.

- [ ] **Step 4: Hand off**

```bash
git log --oneline main..feature/invitations-phase-2a
git status --short
```

Expected: one commit per task (plus fix commits), a clean tree, and `amplify_outputs.json` not tracked. Ask the owner before pushing. Once approved:

```bash
git push -u origin feature/invitations-phase-2a
```

Then give the owner the PR link: `https://github.com/Utsaww/baba-saab/compare/main...feature/invitations-phase-2a?expand=1`. Merging deploys the new `Invitation` table and resolver to production through `ampx pipeline-deploy`. No new AWS permissions are needed.
