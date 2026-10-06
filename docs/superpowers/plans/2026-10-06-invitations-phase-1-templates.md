# Digital Invitations — Phase 1 (Templates) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade to Next.js 14 and ship the 4 invitation templates (each with preset palettes and English/Hindi/both), rendered from one shared data format, previewable at `/admin/templates` on localhost — no AWS needed.

**Architecture:** The existing marketing site moves unchanged into a `(site)` route group; new `(invite)` and `(admin)` route groups get their own root layouts so invitations and admin pages never inherit the site header/footer. All invitation logic lives in `src/InvitationModule`: a zod schema is the single data contract, pure functions in `lib/` hold every rule (dates, sections, RSVP, sharing), shared behaviour components live in `sections/`, and each template is only presentation (a stylesheet, palettes, an opening animation) layered over one shared `TemplateFrame`.

**Tech Stack:** Next.js 14.2 (App Router), React 18, SCSS modules + CSS custom properties, `next/font/google`, zod 3, react-markdown 9 + remark-gfm 4, Vitest 2 + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-06-digital-invitations-design.md`

## Global Constraints

- Work on branch `feature/invitations`; never commit to `main` (the owner cherry-picks to `main` for rollback safety).
- No AWS, auth or database code in this phase. `/admin` pages are unauthenticated until Phase 0 lands and must not be merged to `main` before then.
- JavaScript only (the repo has no TypeScript). Import alias `@/*` → `src/*`.
- `zod` must be **3.x** (`3.23.8`). zod 4 changed `.default()` so nested defaults are not applied; the schema depends on v3 behaviour.
- All dates/times are Indian Standard Time: `Asia/Kolkata`, offset `+05:30`. Dates are `YYYY-MM-DD`, times are 24-hour `HH:mm`.
- Localised text is `{ en?: string, hi?: string }`. `language` is `en | hi | both`.
- Templates: `royal` (Royal Rajasthani), `floral` (Floral Pastel), `temple` (Temple Classic), `minimal` (Modern Minimal). Each has 3 palettes.
- Section ids (cover is always first and never hideable): `invocation, couple, saveTheDate, countdown, venue, travel, schedule, gallery, film, rsvp, closing`.
- Background music is `{ type: "library" | "upload", trackId?, key }`; the Music Library itself arrives in Phase 2.
- Media fields store keys, never URLs; resolve with `mediaUrl()`. Sample data may use full `https://` URLs, which `mediaUrl()` passes through.
- Invitation and admin pages are `noindex`.
- Every staff-facing change updates `docs/admin-guide.md` in the same task.
- Touch targets ≥ 44px; animations respect `prefers-reduced-motion`.
- The "Created by Baba Saab Events" credit shows unless `showCredit` is `false`.

## Review Focus

1. **Hindi-only invitation (`language: "hi"`)** — every section shows Devanagari text, never the string `undefined`, never an English UI label like "Save the Date". Pinned in Task 7 (`renders Hindi-only without English labels or undefined`).
2. **Sparse invitation** (no events, gallery, travel, film, RSVP or closing) — those sections are absent, not rendered empty. Pinned in Task 4 (`visibleSections` defaults) and Task 7 (`omits sections that have no content`).
3. **Countdown after the wedding has started** — shows "The celebrations have begun!", never negative numbers. Pinned in Task 3 (`timeLeft` past) and Task 5 (`Countdown` past).
4. **Event with no time** — schedule shows the date only; calendar entry becomes all-day; nothing crashes. Pinned in Task 3 (`eventWindow` all-day) and Task 7 (`renders an event without a time`).
5. **Unknown template or palette in a preview URL** — unknown template → 404; unknown palette → first palette of that template. Pinned in Task 7 (`getTemplate` / `getPalette` tests) and Task 11 (curl check).

---

## File Structure

```
package.json                                   modify: next 14, deps, test scripts
next.config.js                                 modify: import .md files as strings
vitest.config.mjs                              create
test/setup.js                                  create: jest-dom, cleanup, canvas/audio stubs
test/mocks/next-font-google.js                 create
test/mocks/next-image.jsx                      create

src/app/(site)/…                               move: every existing page + layout (unchanged behaviour)
src/app/(invite)/layout.js                     create: bare root layout for invitations
src/app/(invite)/preview/template/[templateId]/page.js   create: sample render
src/app/(admin)/layout.js                      create: admin root layout + shell
src/app/(admin)/admin/page.js                  create: redirect → /admin/templates
src/app/(admin)/admin/templates/page.js        create: gallery
src/app/(admin)/admin/templates/[templateId]/page.js     create: preview with controls
src/app/(admin)/admin/help/page.js             create: renders docs/admin-guide.md

src/InvitationModule/
  schema/invitation.js (+ .test.js)            data contract
  testing/fixtures.js                          minimalInvitation()
  lib/i18n.js (+test)                          textFor, hasText, plainText, isDevanagari
  lib/invocations.js (+test)                   INVOCATIONS, invocationText
  lib/datetime.js (+test)                      istInstant, formatDate, formatTime, formatDots
  lib/countdown.js (+test)                     timeLeft, countdownTarget
  lib/calendar.js (+test)                      eventWindow, googleCalendarUrl, buildIcs
  lib/rsvp.js (+test)                          isRsvpClosed, validateRsvpInput
  lib/media.js (+test)                         mediaUrl, youtubeId, musicSrc
  lib/share.js (+test)                         shareableUrl, whatsappShareUrl
  lib/sections.js (+test)                      visibleSections
  lib/styles.js (+test)                        mergeStyles
  lib/names.js (+test)                         coupleTitle, monogram
  lib/ui-strings.js                            UI (all fixed guest-facing labels, en + hi)
  sections/Text.jsx (+test)                    <T> localised text
  sections/Emblem.jsx                          invocation emblem (SVG)
  sections/Countdown.jsx (+test)
  sections/OpeningOverlay.jsx (+test)
  sections/reveals/TapReveal.jsx, EnvelopeReveal.jsx, ScrollReveal.jsx, ScratchReveal.jsx (+ reveals.test.jsx)
  sections/useMusic.js, MuteButton.jsx
  sections/Gallery.jsx, Film.jsx, AddToCalendar.jsx, WhatsAppShare.jsx, RsvpForm.jsx (+ tests)
  templates/fonts.js
  templates/sample-base.js                     makeSample()
  templates/base/BaseSections.jsx              CoverBase + SECTION_COMPONENTS
  templates/base/TemplateFrame.jsx
  templates/base/base.module.scss
  templates/<id>/index.jsx, palettes.js, sample.js, <id>.module.scss   × 4
  templates/registry.js (+ registry.test.jsx)  TEMPLATES, getTemplate, getPalette, themeStyle
  InvitationRenderer.jsx, invitation.module.scss

src/AdminModule/AdminShell.jsx, PhoneFrame.jsx, TemplatePreview.jsx, help.module.scss
docs/admin-guide.md
```

---

### Task 1: Branch, Next.js 14 upgrade, and site route group

**Files:**
- Modify: `package.json`, `package-lock.json`
- Move: `src/app/layout.js`, `src/app/page.js`, `src/app/about/`, `src/app/contact/`, `src/app/gallery/`, `src/app/service/`, `src/app/(@servicepage)/` → `src/app/(site)/`
- Modify: `src/app/(site)/layout.js:2-3`, `src/app/(site)/page.js:2`

**Interfaces:**
- Consumes: nothing.
- Produces: branch `feature/invitations`; Next 14; `src/app/(site)/` containing the unchanged site. `src/app/globals.css`, `style.css`, `page.module.css`, `favicon.ico` stay in `src/app/`.

- [ ] **Step 1: Create the branch and commit work already on disk**

The working tree holds earlier React-warning fixes and the spec. Commit them separately so history stays readable.

```bash
git checkout -b feature/invitations
git add src/CommonComponents src/Components src/ContactModule src/HomeModule src/ServiceModule
git commit -m "fix: resolve React key, hydration and DOM attribute warnings"
git add docs/superpowers/specs/2026-10-06-digital-invitations-design.md docs/superpowers/plans/2026-10-06-invitations-phase-1-templates.md
git commit -m "docs: add digital invitations spec and phase 1 plan"
```

Expected: `git status --short` prints nothing.

- [ ] **Step 2: Upgrade Next.js**

```bash
npm install next@14.2.15
```

Expected: `package.json` shows `"next": "^14.2.15"`.

- [ ] **Step 3: Move the existing site into the `(site)` group**

```bash
mkdir -p "src/app/(site)"
git mv src/app/layout.js src/app/page.js src/app/about src/app/contact src/app/gallery src/app/service "src/app/(@servicepage)" "src/app/(site)/"
```

- [ ] **Step 4: Fix the three relative imports**

In `src/app/(site)/layout.js` replace lines 2–3:

```js
import '../globals.css';
import "../style.css";
```

In `src/app/(site)/page.js` replace line 2:

```js
import styles from '../page.module.css'
```

- [ ] **Step 5: Build to verify**

```bash
rm -rf .next && npx next build
```

Expected: `✓ Compiled successfully` and the route table lists `/`, `/about`, `/contact`, `/gallery`, `/service`, `/wedding_planner` … (same 37 routes as before). A `sharp` warning is fine.

- [ ] **Step 6: Smoke-test the dev server**

Stop any running `npm run dev` first (Ctrl+C), then:

```bash
rm -rf .next && npx next dev -p 3005
```

In a second terminal:

```bash
for p in / /about /service /gallery /contact /wedding_planner /corporate_events/annual_function; do echo "$p $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3005$p)"; done
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3005/does-not-exist
```

Expected: every listed page `200`; `/does-not-exist` → `404`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add -A package.json package-lock.json src/app
git commit -m "chore: upgrade to Next.js 14 and move site into (site) route group"
```

---

### Task 2: Test tooling, invitation schema, localisation helpers

**Files:**
- Modify: `package.json` (deps + scripts)
- Create: `vitest.config.mjs`, `test/setup.js`, `test/mocks/next-font-google.js`, `test/mocks/next-image.jsx`
- Create: `src/InvitationModule/schema/invitation.js`, `src/InvitationModule/schema/invitation.test.js`
- Create: `src/InvitationModule/testing/fixtures.js`
- Create: `src/InvitationModule/lib/i18n.js`, `src/InvitationModule/lib/i18n.test.js`
- Create: `src/InvitationModule/lib/invocations.js`, `src/InvitationModule/lib/invocations.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TEMPLATE_IDS`, `LANGUAGES`, `STATUSES`, `SECTION_IDS` (arrays), `invitationSchema` (zod), `parseInvitation(data) → Invitation` (throws `ZodError`).
  - `minimalInvitation() → object` (raw, unparsed input).
  - `textFor(value, lang) → string`, `hasText(value) → boolean`, `plainText(value, lang) → string`, `isDevanagari(str) → boolean`.
  - `INVOCATIONS: {id, name, text}[]`, `invocationText(invocation) → {en?, hi?}`.
  - `npm test` runs Vitest once.

- [ ] **Step 1: Install dependencies**

```bash
npm install zod@3.23.8 react-markdown@9.0.1 remark-gfm@4.0.0
npm install -D vitest@2.1.9 @vitejs/plugin-react@4.3.4 jsdom@25.0.1 @testing-library/react@16.1.0 @testing-library/dom@10.4.0 @testing-library/jest-dom@6.6.3 @testing-library/user-event@14.5.2
```

- [ ] **Step 2: Add test scripts to `package.json`**

In `"scripts"` add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.mjs`**

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": `${root}src`,
      "next/font/google": `${root}test/mocks/next-font-google.js`,
      "next/image": `${root}test/mocks/next-image.jsx`,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
```

- [ ] **Step 4: Create `test/setup.js`**

```js
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.overflow = "";
});

// jsdom has no canvas or media playback; components must cope with that anyway.
HTMLCanvasElement.prototype.getContext = () => null;
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
```

- [ ] **Step 5: Create the two mocks**

`test/mocks/next-font-google.js`:

```js
const font = (name) => () => ({ className: `font-${name}`, variable: `font-${name}`, style: { fontFamily: name } });

export const Cinzel_Decorative = font("cinzel");
export const Cormorant_Garamond = font("cormorant");
export const Great_Vibes = font("greatvibes");
export const Lora = font("lora");
export const Marcellus = font("marcellus");
export const Playfair_Display = font("playfair");
export const Inter = font("inter");
export const Tiro_Devanagari_Hindi = font("hindi");
```

`test/mocks/next-image.jsx`:

```jsx
export default function Image({ src, alt, fill, priority, sizes, ...rest }) {
  return <img src={typeof src === "string" ? src : src?.src} alt={alt} {...rest} />;
}
```

- [ ] **Step 6: Write the fixture**

`src/InvitationModule/testing/fixtures.js`:

```js
// Smallest valid invitation input. Returns a fresh object each call so tests can mutate it.
export function minimalInvitation() {
  return {
    templateId: "royal",
    theme: { palette: "maroon-gold" },
    couple: { bride: { name: { en: "Akriti" } }, groom: { name: { en: "Ankit" } } },
    mainDate: "2026-12-04",
    venue: { name: { en: "Riviera Resort" } },
  };
}
```

- [ ] **Step 7: Write the failing schema tests**

`src/InvitationModule/schema/invitation.test.js`:

```js
import { describe, expect, it } from "vitest";
import { parseInvitation, SECTION_IDS } from "./invitation";
import { minimalInvitation } from "../testing/fixtures";

describe("parseInvitation", () => {
  it("applies defaults to a minimal invitation", () => {
    const inv = parseInvitation(minimalInvitation());
    expect(inv.status).toBe("draft");
    expect(inv.language).toBe("en");
    expect(inv.showCredit).toBe(true);
    expect(inv.theme.sectionOrder).toEqual(SECTION_IDS);
    expect(inv.theme.hidden).toEqual([]);
    expect(inv.events).toEqual([]);
    expect(inv.media.gallery).toEqual([]);
    expect(inv.rsvp).toEqual({ enabled: false, askGuestCount: true, askMeal: false });
    expect(inv.invocation.deity).toBe("ganesh");
    expect(inv.hosts.families).toEqual([]);
    expect(inv.couple.bride.parentsLine).toEqual({});
  });

  it("accepts Hindi-only names", () => {
    const input = minimalInvitation();
    input.couple.bride.name = { hi: "आकृति" };
    expect(parseInvitation(input).couple.bride.name).toEqual({ hi: "आकृति" });
  });

  it("rejects a non-ISO date", () => {
    const input = { ...minimalInvitation(), mainDate: "4-12-2026" };
    expect(() => parseInvitation(input)).toThrow(/YYYY-MM-DD/);
  });

  it("rejects a 12-hour event time", () => {
    const input = { ...minimalInvitation(), events: [{ id: "e1", name: { en: "Sangeet" }, date: "2026-12-03", time: "7pm" }] };
    expect(() => parseInvitation(input)).toThrow(/HH:mm/);
  });

  it("rejects an unknown template", () => {
    expect(() => parseInvitation({ ...minimalInvitation(), templateId: "neon" })).toThrow();
  });

  it("rejects an unknown section id in sectionOrder", () => {
    const input = { ...minimalInvitation(), theme: { palette: "x", sectionOrder: ["couple", "fireworks"] } };
    expect(() => parseInvitation(input)).toThrow();
  });
});
```

- [ ] **Step 8: Run to verify failure**

Run: `npx vitest run src/InvitationModule/schema`
Expected: FAIL — `Failed to resolve import "./invitation"`.

- [ ] **Step 9: Implement the schema**

`src/InvitationModule/schema/invitation.js`:

```js
import { z } from "zod";

export const TEMPLATE_IDS = ["royal", "floral", "temple", "minimal"];
export const LANGUAGES = ["en", "hi", "both"];
export const STATUSES = ["draft", "published", "archived", "deleted"];
// The cover always renders first and cannot be hidden, so it is not a section id.
export const SECTION_IDS = [
  "invocation",
  "couple",
  "saveTheDate",
  "countdown",
  "venue",
  "travel",
  "schedule",
  "gallery",
  "film",
  "rsvp",
  "closing",
];

const localised = z
  .object({ en: z.string().trim().optional(), hi: z.string().trim().optional() })
  .default({});
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)");
const url = z.string().url();

const person = z.object({
  name: localised,
  parentsLine: localised,
  photoKey: z.string().optional(),
});

const event = z.object({
  id: z.string().min(1),
  name: localised,
  date: isoDate,
  time: time24.optional(),
  venueName: localised.optional(),
  address: localised.optional(),
  mapsUrl: url.optional(),
  dressCode: localised.optional(),
  description: localised.optional(),
});

export const invitationSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  templateId: z.enum(TEMPLATE_IDS),
  theme: z.object({
    palette: z.string().min(1),
    sectionOrder: z.array(z.enum(SECTION_IDS)).default(SECTION_IDS),
    hidden: z.array(z.enum(SECTION_IDS)).default([]),
  }),
  status: z.enum(STATUSES).default("draft"),
  language: z.enum(LANGUAGES).default("en"),
  couple: z.object({ bride: person, groom: person }),
  hosts: z
    .object({
      closingLine: localised,
      families: z.array(localised).default([]),
      contactPhone: z.string().optional(),
    })
    .default({}),
  invocation: z
    .object({
      deity: z.enum(["ganesh", "om", "none"]).default("ganesh"),
      presetId: z.string().optional(),
      text: localised,
    })
    .default({}),
  mainDate: isoDate,
  venue: z.object({
    name: localised,
    address: localised,
    mapsUrl: url.optional(),
    travelNotes: localised.optional(),
  }),
  events: z.array(event).default([]),
  media: z
    .object({
      coverKey: z.string().optional(),
      gallery: z.array(z.object({ key: z.string().min(1), caption: localised.optional() })).default([]),
      music: z
        .object({ type: z.enum(["library", "upload"]), trackId: z.string().optional(), key: z.string().min(1) })
        .optional(),
      film: z
        .object({ type: z.enum(["youtube", "upload"]), url: url.optional(), key: z.string().optional() })
        .optional(),
    })
    .default({}),
  rsvp: z
    .object({
      enabled: z.boolean().default(false),
      deadline: isoDate.optional(),
      askGuestCount: z.boolean().default(true),
      askMeal: z.boolean().default(false),
    })
    .default({}),
  showCredit: z.boolean().default(true),
});

export function parseInvitation(data) {
  return invitationSchema.parse(data);
}
```

- [ ] **Step 10: Run schema tests**

Run: `npx vitest run src/InvitationModule/schema`
Expected: PASS (6 tests).

- [ ] **Step 11: Write failing i18n and invocation tests**

`src/InvitationModule/lib/i18n.test.js`:

```js
import { describe, expect, it } from "vitest";
import { hasText, isDevanagari, plainText, textFor } from "./i18n";

describe("textFor", () => {
  it("returns the requested language", () => {
    expect(textFor({ en: "Sangeet", hi: "संगीत" }, "hi")).toBe("संगीत");
    expect(textFor({ en: "Sangeet", hi: "संगीत" }, "en")).toBe("Sangeet");
  });
  it("falls back to the other language rather than showing nothing", () => {
    expect(textFor({ en: "Sangeet" }, "hi")).toBe("Sangeet");
    expect(textFor({ hi: "संगीत" }, "en")).toBe("संगीत");
  });
  it("treats whitespace and missing values as empty", () => {
    expect(textFor({ en: "  " }, "en")).toBe("");
    expect(textFor(undefined, "en")).toBe("");
  });
});

describe("hasText", () => {
  it("is true when either language has text", () => {
    expect(hasText({ hi: "संगीत" })).toBe(true);
    expect(hasText({ en: " " })).toBe(false);
    expect(hasText(undefined)).toBe(false);
  });
});

describe("plainText", () => {
  it("joins both languages for 'both'", () => {
    expect(plainText({ en: "Venue", hi: "स्थल" }, "both")).toBe("Venue / स्थल");
    expect(plainText({ en: "Venue" }, "both")).toBe("Venue");
  });
  it("behaves like textFor for a single language", () => {
    expect(plainText({ en: "Venue", hi: "स्थल" }, "hi")).toBe("स्थल");
  });
});

describe("isDevanagari", () => {
  it("detects Devanagari", () => {
    expect(isDevanagari("शुभ विवाह")).toBe(true);
    expect(isDevanagari("Shubh Vivah")).toBe(false);
  });
});
```

`src/InvitationModule/lib/invocations.test.js`:

```js
import { describe, expect, it } from "vitest";
import { INVOCATIONS, invocationText } from "./invocations";

describe("invocationText", () => {
  it("uses the preset text when a known preset is chosen", () => {
    const text = invocationText({ presetId: "shri-ganeshaya", text: { en: "ignored" } });
    expect(text).toEqual({ hi: "॥ श्री गणेशाय नमः ॥" });
  });
  it("falls back to custom text for an unknown or missing preset", () => {
    expect(invocationText({ presetId: "nope", text: { en: "Om" } })).toEqual({ en: "Om" });
    expect(invocationText({ text: { hi: "ॐ" } })).toEqual({ hi: "ॐ" });
    expect(invocationText(undefined)).toEqual({});
  });
  it("ships the five approved presets", () => {
    expect(INVOCATIONS.map((i) => i.id)).toEqual(["vakratunda", "shri-ganeshaya", "mangalam", "shubh-vivah", "om"]);
  });
});
```

- [ ] **Step 12: Run to verify failure**

Run: `npx vitest run src/InvitationModule/lib`
Expected: FAIL — cannot resolve `./i18n` and `./invocations`.

- [ ] **Step 13: Implement `i18n.js` and `invocations.js`**

`src/InvitationModule/lib/i18n.js`:

```js
const clean = (s) => (typeof s === "string" ? s.trim() : "");

// Text for one language, falling back to the other so a section is never blank.
export function textFor(value, lang) {
  const en = clean(value?.en);
  const hi = clean(value?.hi);
  if (lang === "hi") return hi || en;
  return en || hi;
}

export function hasText(value) {
  return Boolean(clean(value?.en) || clean(value?.hi));
}

// Single-string form for attributes (alt, aria-label, option text).
export function plainText(value, lang) {
  if (lang === "both") {
    const en = clean(value?.en);
    const hi = clean(value?.hi);
    return en && hi ? `${en} / ${hi}` : en || hi;
  }
  return textFor(value, lang);
}

export function isDevanagari(str) {
  return /[\u0900-\u097F]/.test(str ?? "");
}
```

`src/InvitationModule/lib/invocations.js`:

```js
export const INVOCATIONS = [
  {
    id: "vakratunda",
    name: "Ganesh Vandana",
    text: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥",
  },
  { id: "shri-ganeshaya", name: "Shri Ganeshaya Namah", text: "॥ श्री गणेशाय नमः ॥" },
  {
    id: "mangalam",
    name: "Mangal Shloka",
    text: "मङ्गलम् भगवान विष्णुः मङ्गलम् गरुड़ध्वजः।\nमङ्गलम् पुण्डरीकाक्षः मङ्गलाय तनो हरिः॥",
  },
  { id: "shubh-vivah", name: "Shubh Vivah", text: "॥ शुभ विवाह ॥" },
  { id: "om", name: "Om", text: "॥ ॐ ॥" },
];

export function invocationText(invocation) {
  const preset = INVOCATIONS.find((i) => i.id === invocation?.presetId);
  return preset ? { hi: preset.text } : invocation?.text ?? {};
}
```

- [ ] **Step 14: Run all tests**

Run: `npm test`
Expected: PASS (all schema, i18n, invocation tests).

- [ ] **Step 15: Commit**

```bash
git add package.json package-lock.json vitest.config.mjs test src/InvitationModule
git commit -m "feat(invitations): add test tooling, invitation schema and localisation helpers"
```

---

### Task 3: Date, countdown, calendar and RSVP rules

**Files:**
- Create: `src/InvitationModule/lib/datetime.js` (+ `datetime.test.js`)
- Create: `src/InvitationModule/lib/countdown.js` (+ `countdown.test.js`)
- Create: `src/InvitationModule/lib/calendar.js` (+ `calendar.test.js`)
- Create: `src/InvitationModule/lib/rsvp.js` (+ `rsvp.test.js`)

**Interfaces:**
- Consumes: `parseInvitation`, `minimalInvitation` (Task 2).
- Produces:
  - `istInstant(date, time?) → Date` (Invalid Date on bad input), `formatDate(date, lang) → string`, `formatTime(time, lang) → string`, `formatDots(date) → "DD · MM · YYYY"` (all return `""` on bad input).
  - `timeLeft(targetMs, nowMs) → {days, hours, minutes, seconds, done}`, `countdownTarget(invitation) → number (ms)`.
  - `eventWindow({date, time}) → {allDay, start, end} | null`, `googleCalendarUrl({title, date, time, location, details}) → string | null`, `buildIcs(entries, {uidPrefix?, now?}) → string`.
  - `isRsvpClosed(rsvp, nowMs?) → boolean`, `validateRsvpInput(input, {askGuestCount}) → {[field]: "required" | "phone" | "count"}`.

- [ ] **Step 1: Write failing tests**

`src/InvitationModule/lib/datetime.test.js`:

```js
import { describe, expect, it } from "vitest";
import { formatDate, formatDots, formatTime, istInstant } from "./datetime";

describe("istInstant", () => {
  it("interprets date and time as IST", () => {
    expect(istInstant("2026-12-04", "19:00").toISOString()).toBe("2026-12-04T13:30:00.000Z");
    expect(istInstant("2026-12-04").toISOString()).toBe("2026-12-03T18:30:00.000Z");
  });
  it("returns an invalid date for bad input", () => {
    expect(Number.isNaN(istInstant("04-12-2026").getTime())).toBe(true);
    expect(Number.isNaN(istInstant(undefined).getTime())).toBe(true);
  });
});

describe("formatDate", () => {
  it("formats in English and Hindi", () => {
    expect(formatDate("2026-12-04", "en")).toMatch(/Friday.*4 December 2026/);
    expect(formatDate("2026-12-04", "hi")).toMatch(/दिसंबर/);
  });
  it("returns an empty string for bad input", () => {
    expect(formatDate("not-a-date", "en")).toBe("");
  });
});

describe("formatTime", () => {
  it("formats 24-hour input as 12-hour", () => {
    expect(formatTime("19:00", "en")).toMatch(/^7:00\spm$/i);
  });
  it("returns an empty string for missing or invalid time", () => {
    expect(formatTime(undefined, "en")).toBe("");
    expect(formatTime("25:00", "en")).toBe("");
  });
});

describe("formatDots", () => {
  it("formats as DD · MM · YYYY", () => {
    expect(formatDots("2026-12-04")).toBe("04 · 12 · 2026");
    expect(formatDots("bad")).toBe("");
  });
});
```

`src/InvitationModule/lib/countdown.test.js`:

```js
import { describe, expect, it } from "vitest";
import { countdownTarget, timeLeft } from "./countdown";
import { parseInvitation } from "../schema/invitation";
import { minimalInvitation } from "../testing/fixtures";

describe("timeLeft", () => {
  it("splits the remaining time into units", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    expect(timeLeft(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  });
  it("never goes negative once the target has passed", () => {
    expect(timeLeft(1000, 5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });
});

describe("countdownTarget", () => {
  it("counts down to midnight IST when no event is on the main date", () => {
    const inv = parseInvitation(minimalInvitation());
    expect(new Date(countdownTarget(inv)).toISOString()).toBe("2026-12-03T18:30:00.000Z");
  });
  it("counts down to the earliest timed event on the main date", () => {
    const inv = parseInvitation({
      ...minimalInvitation(),
      events: [
        { id: "a", name: { en: "Vivah" }, date: "2026-12-04", time: "19:00" },
        { id: "b", name: { en: "Baraat" }, date: "2026-12-04", time: "16:00" },
        { id: "c", name: { en: "Mehendi" }, date: "2026-12-03", time: "11:00" },
      ],
    });
    expect(new Date(countdownTarget(inv)).toISOString()).toBe("2026-12-04T10:30:00.000Z");
  });
});
```

`src/InvitationModule/lib/calendar.test.js`:

```js
import { describe, expect, it } from "vitest";
import { buildIcs, eventWindow, googleCalendarUrl } from "./calendar";

describe("eventWindow", () => {
  it("makes a 3-hour UTC window for a timed event", () => {
    expect(eventWindow({ date: "2026-12-04", time: "19:00" })).toEqual({
      allDay: false,
      start: "20261204T133000Z",
      end: "20261204T163000Z",
    });
  });
  it("makes an all-day entry when there is no time", () => {
    expect(eventWindow({ date: "2026-12-31" })).toEqual({ allDay: true, start: "20261231", end: "20270101" });
  });
  it("returns null for a bad date", () => {
    expect(eventWindow({ date: "31/12/2026" })).toBeNull();
  });
});

describe("googleCalendarUrl", () => {
  it("builds a Google Calendar template link", () => {
    const url = new URL(googleCalendarUrl({ title: "Sangeet — A & B", date: "2026-12-03", time: "19:30", location: "Jaipur" }));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Sangeet — A & B");
    expect(url.searchParams.get("dates")).toBe("20261203T140000Z/20261203T170000Z");
    expect(url.searchParams.get("location")).toBe("Jaipur");
  });
  it("returns null for a bad date", () => {
    expect(googleCalendarUrl({ title: "x", date: "bad" })).toBeNull();
  });
});

describe("buildIcs", () => {
  const now = new Date("2026-10-06T00:00:00Z");
  it("produces CRLF-separated VEVENTs with escaped text", () => {
    const ics = buildIcs([{ title: "Vivah", date: "2026-12-04", time: "19:00", location: "Riviera, Rishikesh", details: "A; B" }], { uidPrefix: "t", now });
    expect(ics.split("\r\n")).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Baba Saab Events//Invitations//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:t-0@babasaab",
      "DTSTAMP:20261006T000000Z",
      "DTSTART:20261204T133000Z",
      "DTEND:20261204T163000Z",
      "SUMMARY:Vivah",
      "LOCATION:Riviera\\, Rishikesh",
      "DESCRIPTION:A\\; B",
      "END:VEVENT",
      "END:VCALENDAR",
    ]);
  });
  it("skips entries with bad dates and writes all-day dates", () => {
    const ics = buildIcs([{ title: "Bad", date: "x" }, { title: "Haldi", date: "2026-12-03" }], { now });
    expect(ics).not.toContain("SUMMARY:Bad");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261203");
    expect(ics).toContain("DTEND;VALUE=DATE:20261204");
  });
});
```

`src/InvitationModule/lib/rsvp.test.js`:

```js
import { describe, expect, it } from "vitest";
import { isRsvpClosed, validateRsvpInput } from "./rsvp";

describe("isRsvpClosed", () => {
  const rsvp = { enabled: true, deadline: "2026-10-31" };
  it("stays open until the end of the deadline day in IST", () => {
    expect(isRsvpClosed(rsvp, Date.parse("2026-10-31T18:29:59Z"))).toBe(false);
  });
  it("closes once the deadline day ends in IST", () => {
    expect(isRsvpClosed(rsvp, Date.parse("2026-10-31T18:30:00Z"))).toBe(true);
  });
  it("is never closed without a deadline", () => {
    expect(isRsvpClosed({ enabled: true }, Date.parse("2099-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("validateRsvpInput", () => {
  const ok = { name: "Sharma Parivar", phone: "+91 98765 43210", attending: "yes", guestCount: "3" };
  it("accepts a complete response", () => {
    expect(validateRsvpInput(ok, { askGuestCount: true })).toEqual({});
  });
  it("flags missing name, bad phone and missing attendance", () => {
    expect(validateRsvpInput({ name: " ", phone: "123", attending: "" }, { askGuestCount: false })).toEqual({
      name: "required",
      phone: "phone",
      attending: "required",
    });
  });
  it("checks guest count only when asked and attending", () => {
    expect(validateRsvpInput({ ...ok, guestCount: "0" }, { askGuestCount: true })).toEqual({ guestCount: "count" });
    expect(validateRsvpInput({ ...ok, guestCount: "21" }, { askGuestCount: true })).toEqual({ guestCount: "count" });
    expect(validateRsvpInput({ ...ok, attending: "no", guestCount: "0" }, { askGuestCount: true })).toEqual({});
    expect(validateRsvpInput({ ...ok, guestCount: "0" }, { askGuestCount: false })).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/lib`
Expected: FAIL — cannot resolve `./datetime`, `./countdown`, `./calendar`, `./rsvp`.

- [ ] **Step 3: Implement**

`src/InvitationModule/lib/datetime.js`:

```js
const TIME_ZONE = "Asia/Kolkata";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isValid = (d) => !Number.isNaN(d.getTime());
const locale = (lang) => (lang === "hi" ? "hi-IN" : "en-IN");

// All invitation dates and times are Indian Standard Time.
export function istInstant(date, time) {
  if (!DATE_RE.test(date ?? "")) return new Date(NaN);
  return new Date(`${date}T${time || "00:00"}:00+05:30`);
}

export function formatDate(date, lang = "en") {
  const d = istInstant(date);
  if (!isValid(d)) return "";
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function formatTime(time, lang = "en") {
  if (!TIME_RE.test(time ?? "")) return "";
  return new Intl.DateTimeFormat(locale(lang), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(istInstant("2000-01-01", time));
}

export function formatDots(date) {
  const m = DATE_RE.exec(date ?? "");
  return m ? `${m[3]} · ${m[2]} · ${m[1]}` : "";
}
```

`src/InvitationModule/lib/countdown.js`:

```js
import { istInstant } from "./datetime";

export function timeLeft(targetMs, nowMs) {
  const diff = Math.max(0, targetMs - nowMs);
  const total = Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: diff === 0,
  };
}

// Earliest timed event on the main date, otherwise the start of that day.
export function countdownTarget(invitation) {
  const times = invitation.events
    .filter((e) => e.date === invitation.mainDate && e.time)
    .map((e) => e.time)
    .sort();
  return istInstant(invitation.mainDate, times[0]).getTime();
}
```

`src/InvitationModule/lib/calendar.js`:

```js
import { istInstant } from "./datetime";

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dayStamp = (isoDate) => isoDate.replace(/-/g, "");

function nextDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const escapeIcs = (s = "") =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function eventWindow({ date, time }) {
  const start = istInstant(date, time);
  if (Number.isNaN(start.getTime())) return null;
  if (!time) return { allDay: true, start: dayStamp(date), end: dayStamp(nextDay(date)) };
  return { allDay: false, start: utcStamp(start), end: utcStamp(new Date(start.getTime() + DEFAULT_DURATION_MS)) };
}

export function googleCalendarUrl(entry) {
  const w = eventWindow(entry);
  if (!w) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${w.start}/${w.end}`,
    details: entry.details ?? "",
    location: entry.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(entries, { uidPrefix = "invite", now = new Date() } = {}) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Baba Saab Events//Invitations//EN", "CALSCALE:GREGORIAN"];
  entries.forEach((entry, i) => {
    const w = eventWindow(entry);
    if (!w) return;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uidPrefix}-${i}@babasaab`,
      `DTSTAMP:${utcStamp(now)}`,
      w.allDay ? `DTSTART;VALUE=DATE:${w.start}` : `DTSTART:${w.start}`,
      w.allDay ? `DTEND;VALUE=DATE:${w.end}` : `DTEND:${w.end}`,
      `SUMMARY:${escapeIcs(entry.title)}`,
      `LOCATION:${escapeIcs(entry.location)}`,
      `DESCRIPTION:${escapeIcs(entry.details)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
```

`src/InvitationModule/lib/rsvp.js`:

```js
import { istInstant } from "./datetime";

const PHONE_RE = /^\+?\d[\d\s-]{8,14}\d$/;
const LAST_MS_OF_MINUTE = 59_999;

// RSVPs stay open through the whole deadline day in IST.
export function isRsvpClosed(rsvp, now = Date.now()) {
  if (!rsvp?.deadline) return false;
  const end = istInstant(rsvp.deadline, "23:59").getTime() + LAST_MS_OF_MINUTE;
  if (Number.isNaN(end)) return false;
  return now > end;
}

export function validateRsvpInput(input, { askGuestCount }) {
  const errors = {};
  if (!input.name?.trim()) errors.name = "required";
  if (!PHONE_RE.test(input.phone?.trim() ?? "")) errors.phone = "phone";
  if (!["yes", "no", "maybe"].includes(input.attending)) errors.attending = "required";
  if (askGuestCount && input.attending !== "no") {
    const n = Number(input.guestCount);
    if (!Number.isInteger(n) || n < 1 || n > 20) errors.guestCount = "count";
  }
  return errors;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS. If `formatTime` fails only on whitespace, the regex `\s` already covers the narrow no-break space newer ICU versions emit — check the actual output with `node -e "console.log(JSON.stringify(new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}).format(new Date('2000-01-01T19:00:00+05:30'))))"` before changing code.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/lib
git commit -m "feat(invitations): add IST date, countdown, calendar and RSVP rules"
```

---

### Task 4: Content rules — media, sharing, sections, styles, names, UI strings

**Files:**
- Create: `src/InvitationModule/lib/media.js` (+ `media.test.js`)
- Create: `src/InvitationModule/lib/share.js` (+ `share.test.js`)
- Create: `src/InvitationModule/lib/sections.js` (+ `sections.test.js`)
- Create: `src/InvitationModule/lib/styles.js` (+ `styles.test.js`)
- Create: `src/InvitationModule/lib/names.js` (+ `names.test.js`)
- Create: `src/InvitationModule/lib/ui-strings.js`

**Interfaces:**
- Consumes: `SECTION_IDS`, `parseInvitation`, `minimalInvitation`, `hasText`, `textFor`, `invocationText`.
- Produces:
  - `mediaUrl(key) → string | null`, `youtubeId(url) → string | null`, `musicSrc(music) → string | null`.
  - `shareableUrl(href) → string` (drops `g`, `preview`, hash), `whatsappShareUrl(text) → string`.
  - `visibleSections(invitation) → SectionId[]`.
  - `mergeStyles(...cssModules) → {[className]: string}`.
  - `coupleTitle(invitation, lang?) → "Bride & Groom"`, `monogram(invitation) → "B&G"`.
  - `UI` — object of `{en, hi}` labels; keys listed in Step 3.

- [ ] **Step 1: Write failing tests**

`src/InvitationModule/lib/media.test.js`:

```js
import { afterEach, describe, expect, it, vi } from "vitest";
import { mediaUrl, musicSrc, youtubeId } from "./media";

afterEach(() => vi.unstubAllEnvs());

describe("mediaUrl", () => {
  it("passes full URLs through", () => {
    expect(mediaUrl("https://images.unsplash.com/a.jpg")).toBe("https://images.unsplash.com/a.jpg");
  });
  it("prefixes keys with the media base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com/");
    expect(mediaUrl("/invitations/1/cover.jpg")).toBe("https://cdn.example.com/invitations/1/cover.jpg");
  });
  it("returns null for an empty key", () => {
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl("")).toBeNull();
  });
});

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abcdefghijk", "abcdefghijk"],
    ["https://youtube.com/watch?feature=share&v=abcdefghijk", "abcdefghijk"],
    ["https://youtu.be/abcdefghijk?t=3", "abcdefghijk"],
    ["https://www.youtube.com/embed/abcdefghijk", "abcdefghijk"],
    ["https://www.youtube.com/shorts/abcdefghijk", "abcdefghijk"],
  ])("extracts the id from %s", (url, id) => {
    expect(youtubeId(url)).toBe(id);
  });
  it("returns null for non-YouTube links", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId(undefined)).toBeNull();
  });
});

describe("musicSrc", () => {
  it("plays the stored key for library tracks and uploads", () => {
    expect(musicSrc({ type: "upload", key: "https://cdn.example.com/a.mp3" })).toBe("https://cdn.example.com/a.mp3");
    expect(musicSrc({ type: "library", trackId: "t1", key: "https://cdn.example.com/lib.mp3" })).toBe("https://cdn.example.com/lib.mp3");
    expect(musicSrc(undefined)).toBeNull();
  });
});
```

`src/InvitationModule/lib/share.test.js`:

```js
import { describe, expect, it } from "vitest";
import { shareableUrl, whatsappShareUrl } from "./share";

describe("shareableUrl", () => {
  it("removes the personal guest code and preview token", () => {
    expect(shareableUrl("https://site.com/invitation/a-weds-b?g=k9f2&preview=tok#rsvp")).toBe("https://site.com/invitation/a-weds-b");
  });
  it("keeps unrelated params", () => {
    expect(shareableUrl("https://site.com/invitation/x?lang=hi&g=1")).toBe("https://site.com/invitation/x?lang=hi");
  });
});

describe("whatsappShareUrl", () => {
  it("encodes the message", () => {
    expect(whatsappShareUrl("A & B\nhttps://x.y")).toBe("https://wa.me/?text=A%20%26%20B%0Ahttps%3A%2F%2Fx.y");
  });
});
```

`src/InvitationModule/lib/sections.test.js`:

```js
import { describe, expect, it } from "vitest";
import { visibleSections } from "./sections";
import { parseInvitation } from "../schema/invitation";
import { minimalInvitation } from "../testing/fixtures";

const build = (overrides = {}) => parseInvitation({ ...minimalInvitation(), ...overrides });

describe("visibleSections", () => {
  it("shows only sections with content for a sparse invitation", () => {
    expect(visibleSections(build())).toEqual(["invocation", "couple", "saveTheDate", "countdown", "venue"]);
  });

  it("drops the invocation when deity is none and there is no text", () => {
    expect(visibleSections(build({ invocation: { deity: "none" } }))).not.toContain("invocation");
  });

  it("shows content-driven sections once they have content", () => {
    const inv = build({
      venue: { name: { en: "Riviera" }, travelNotes: { en: "Airport 20 km" } },
      events: [{ id: "e", name: { en: "Sangeet" }, date: "2026-12-03" }],
      media: { gallery: [{ key: "a.jpg" }], film: { type: "youtube", url: "https://youtu.be/abcdefghijk" } },
      rsvp: { enabled: true },
      hosts: { families: [{ en: "Sharma family" }] },
    });
    expect(visibleSections(inv)).toEqual([
      "invocation", "couple", "saveTheDate", "countdown", "venue", "travel", "schedule", "gallery", "film", "rsvp", "closing",
    ]);
  });

  it("follows the custom order, removes hidden and duplicate ids, and appends missing ids", () => {
    const inv = build({ theme: { palette: "p", sectionOrder: ["venue", "couple", "venue"], hidden: ["countdown"] } });
    expect(visibleSections(inv)).toEqual(["venue", "couple", "invocation", "saveTheDate"]);
  });
});
```

`src/InvitationModule/lib/styles.test.js`:

```js
import { describe, expect, it } from "vitest";
import { mergeStyles } from "./styles";

describe("mergeStyles", () => {
  it("joins class names for keys present in any module", () => {
    expect(mergeStyles({ root: "a", cover: "b" }, { root: "c", flap: "d" }, undefined)).toEqual({ root: "a c", cover: "b", flap: "d" });
  });
});
```

`src/InvitationModule/lib/names.test.js`:

```js
import { describe, expect, it } from "vitest";
import { coupleTitle, monogram } from "./names";
import { parseInvitation } from "../schema/invitation";
import { minimalInvitation } from "../testing/fixtures";

describe("names", () => {
  it("builds the couple title and monogram", () => {
    const inv = parseInvitation(minimalInvitation());
    expect(coupleTitle(inv)).toBe("Akriti & Ankit");
    expect(monogram(inv)).toBe("A&A");
  });
  it("uses Hindi names when English is missing", () => {
    const input = minimalInvitation();
    input.couple.bride.name = { hi: "मीरा" };
    input.couple.groom.name = { hi: "अर्जुन" };
    const inv = parseInvitation(input);
    expect(coupleTitle(inv, "hi")).toBe("मीरा & अर्जुन");
    expect(monogram(inv)).toBe("म&अ");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/lib`
Expected: FAIL — unresolved `./media`, `./share`, `./sections`, `./styles`, `./names`.

- [ ] **Step 3: Implement**

`src/InvitationModule/lib/media.js`:

```js
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

// Media fields store storage keys; full URLs (sample data) pass through unchanged.
export function mediaUrl(key) {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/${key.replace(/^\//, "")}`;
}

export function youtubeId(url) {
  const m = YOUTUBE_RE.exec(url ?? "");
  return m ? m[1] : null;
}

// Library tracks and one-off uploads both store their file key on the invitation, so no lookup is needed.
export function musicSrc(music) {
  return mediaUrl(music?.key);
}
```

`src/InvitationModule/lib/share.js`:

```js
// Personal guest codes and preview tokens must never travel with a forwarded link.
export function shareableUrl(href) {
  const url = new URL(href);
  url.searchParams.delete("g");
  url.searchParams.delete("preview");
  url.hash = "";
  return url.toString();
}

export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
```

`src/InvitationModule/lib/sections.js`:

```js
import { SECTION_IDS } from "../schema/invitation";
import { hasText } from "./i18n";
import { invocationText } from "./invocations";

const hasContent = {
  invocation: (inv) => inv.invocation.deity !== "none" || hasText(invocationText(inv.invocation)),
  couple: () => true,
  saveTheDate: () => true,
  countdown: () => true,
  venue: (inv) => hasText(inv.venue.name),
  travel: (inv) => hasText(inv.venue.travelNotes),
  schedule: (inv) => inv.events.length > 0,
  gallery: (inv) => inv.media.gallery.length > 0,
  film: (inv) => Boolean(inv.media.film?.url || inv.media.film?.key),
  rsvp: (inv) => inv.rsvp.enabled,
  closing: (inv) => hasText(inv.hosts.closingLine) || inv.hosts.families.some(hasText),
};

// Staff order first; any section missing from that order is appended so new sections never vanish.
export function visibleSections(inv) {
  const order = [...new Set(inv.theme.sectionOrder.filter((id) => SECTION_IDS.includes(id)))];
  for (const id of SECTION_IDS) if (!order.includes(id)) order.push(id);
  const hidden = new Set(inv.theme.hidden);
  return order.filter((id) => !hidden.has(id) && hasContent[id](inv));
}
```

`src/InvitationModule/lib/styles.js`:

```js
// Combine CSS modules: shared base classes plus a template's overrides under the same names.
export function mergeStyles(...modules) {
  const keys = new Set(modules.flatMap((m) => (m ? Object.keys(m) : [])));
  const merged = {};
  for (const key of keys) merged[key] = modules.map((m) => m?.[key]).filter(Boolean).join(" ");
  return merged;
}
```

`src/InvitationModule/lib/names.js`:

```js
import { textFor } from "./i18n";

export function coupleTitle(inv, lang = "en") {
  return `${textFor(inv.couple.bride.name, lang)} & ${textFor(inv.couple.groom.name, lang)}`;
}

export function monogram(inv) {
  const first = (v) => Array.from(textFor(v, "en"))[0] ?? "";
  return `${first(inv.couple.bride.name)}&${first(inv.couple.groom.name)}`;
}
```

`src/InvitationModule/lib/ui-strings.js`:

```js
// Every fixed label a guest can see, in English and Hindi.
export const UI = {
  weddingOf: { en: "The wedding of", hi: "शुभ विवाह" },
  together: { en: "Together with their families", hi: "अपने परिवारों के साथ" },
  saveTheDate: { en: "Save the Date", hi: "तिथि याद रखें" },
  countdown: { en: "Counting down", hi: "शुभ घड़ी की प्रतीक्षा" },
  days: { en: "Days", hi: "दिन" },
  hours: { en: "Hours", hi: "घंटे" },
  minutes: { en: "Minutes", hi: "मिनट" },
  seconds: { en: "Seconds", hi: "सेकंड" },
  begun: { en: "The celebrations have begun!", hi: "उत्सव आरंभ हो चुका है!" },
  venue: { en: "Venue", hi: "स्थल" },
  openMap: { en: "Open in Google Maps", hi: "गूगल मैप्स में देखें" },
  travel: { en: "Getting there", hi: "कैसे पहुँचें" },
  schedule: { en: "Celebrations", hi: "कार्यक्रम" },
  dressCode: { en: "Dress code", hi: "पोशाक" },
  addToCalendar: { en: "Add to Google Calendar", hi: "गूगल कैलेंडर में जोड़ें" },
  downloadIcs: { en: "Download (.ics)", hi: "डाउनलोड (.ics)" },
  gallery: { en: "Our moments", hi: "हमारे पल" },
  film: { en: "The invitation film", hi: "निमंत्रण फ़िल्म" },
  rsvp: { en: "RSVP", hi: "उपस्थिति की पुष्टि" },
  rsvpBy: { en: "Kindly respond by", hi: "कृपया उत्तर दें" },
  rsvpClosed: { en: "RSVPs closed on", hi: "उत्तर देने की अंतिम तिथि थी" },
  rsvpContact: { en: "For changes, please contact the family:", hi: "बदलाव के लिए परिवार से संपर्क करें:" },
  rsvpPreview: { en: "RSVP opens once this invitation is published.", hi: "निमंत्रण प्रकाशित होने पर उत्तर दे सकेंगे।" },
  rsvpFailed: { en: "Something went wrong. Please try again.", hi: "कुछ गड़बड़ हुई। कृपया फिर से प्रयास करें।" },
  name: { en: "Name", hi: "नाम" },
  phone: { en: "Phone", hi: "फ़ोन" },
  attending: { en: "Will you join us?", hi: "क्या आप पधारेंगे?" },
  yes: { en: "Joyfully accept", hi: "सहर्ष स्वीकार" },
  no: { en: "Regretfully decline", hi: "खेद सहित अस्वीकार" },
  maybe: { en: "Not sure yet", hi: "अभी तय नहीं" },
  guests: { en: "Number of guests", hi: "अतिथियों की संख्या" },
  whichEvents: { en: "Which celebrations will you attend?", hi: "आप किन कार्यक्रमों में आएँगे?" },
  meal: { en: "Meal preference", hi: "भोजन वरीयता" },
  mealVeg: { en: "Vegetarian", hi: "शाकाहारी" },
  mealNonVeg: { en: "Non-vegetarian", hi: "मांसाहारी" },
  mealJain: { en: "Jain", hi: "जैन" },
  message: { en: "Message for the couple", hi: "दंपति के लिए संदेश" },
  submit: { en: "Send RSVP", hi: "उत्तर भेजें" },
  sending: { en: "Sending…", hi: "भेजा जा रहा है…" },
  thanks: { en: "Thank you! Your response has been received.", hi: "धन्यवाद! आपका उत्तर मिल गया है।" },
  closing: { en: "With best compliments from", hi: "शुभाकांक्षी" },
  share: { en: "Share on WhatsApp", hi: "व्हाट्सऐप पर भेजें" },
  tapToOpen: { en: "Tap to open", hi: "खोलने के लिए टैप करें" },
  scratchHint: { en: "Scratch to reveal the date", hi: "तिथि देखने के लिए खुरचें" },
  revealNow: { en: "or tap here", hi: "या यहाँ टैप करें" },
  scrollToOpen: { en: "Scroll to open", hi: "खोलने के लिए स्क्रॉल करें" },
  credit: { en: "Created by Baba Saab Events", hi: "बाबा साब इवेंट्स द्वारा निर्मित" },
  errors: {
    required: { en: "This field is required", hi: "यह आवश्यक है" },
    phone: { en: "Enter a valid phone number", hi: "सही फ़ोन नंबर दर्ज करें" },
    count: { en: "Enter a number from 1 to 20", hi: "1 से 20 के बीच संख्या दर्ज करें" },
  },
};
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/lib
git commit -m "feat(invitations): add media, sharing, section visibility and UI strings"
```

---

### Task 5: Display primitives — text, emblem, countdown, opening overlay, reveals, music

**Files:**
- Create: `src/InvitationModule/sections/Text.jsx` (+ `Text.test.jsx`)
- Create: `src/InvitationModule/sections/Emblem.jsx`
- Create: `src/InvitationModule/sections/Countdown.jsx` (+ `Countdown.test.jsx`)
- Create: `src/InvitationModule/sections/OpeningOverlay.jsx` (+ `OpeningOverlay.test.jsx`)
- Create: `src/InvitationModule/sections/reveals/TapReveal.jsx`, `EnvelopeReveal.jsx`, `ScrollReveal.jsx`, `ScratchReveal.jsx` (+ `reveals.test.jsx`)
- Create: `src/InvitationModule/sections/useMusic.js`, `src/InvitationModule/sections/MuteButton.jsx`

**Interfaces:**
- Consumes: `textFor`, `isDevanagari`, `timeLeft`, `UI`.
- Produces:
  - `<T v={localised} lang as? className? />` — renders nothing when empty; for `both` renders English then a `<span class="hiLine" lang="hi">`.
  - `<Emblem deity className />`.
  - `<Countdown target={ms} lang s={styles} />` — uses `s.countdown, s.countItem, s.countNum, s.countLabel, s.countDone`.
  - `<OpeningOverlay className closingClassName onOpen label?>{(open) => node}</OpeningOverlay>`; `CLOSE_MS = 700`.
  - Reveals, all `onReveal: () => void`: `<TapReveal className>`, `<EnvelopeReveal className label>` (sets `data-open`; `ENVELOPE_MS = 900`), `<ScrollReveal className>`, `<ScratchReveal className surfaceClassName buttonClassName hint>`.
  - `useMusic(src) → {enabled, playing, play, toggle}`; `<MuteButton playing onToggle className />`.

- [ ] **Step 1: Write failing tests**

`src/InvitationModule/sections/Text.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import T from "./Text";

describe("<T>", () => {
  it("renders one language", () => {
    const { container } = render(<T v={{ en: "Venue", hi: "स्थल" }} lang="en" />);
    expect(container.textContent).toBe("Venue");
  });
  it("marks Hindi text with lang=hi", () => {
    const { container } = render(<T v={{ en: "Venue", hi: "स्थल" }} lang="hi" as="p" />);
    expect(container.querySelector("p")).toHaveAttribute("lang", "hi");
  });
  it("renders both languages with Hindi on its own line", () => {
    const { container } = render(<T v={{ en: "Venue", hi: "स्थल" }} lang="both" />);
    expect(container.textContent).toBe("Venueस्थल");
    expect(container.querySelector(".hiLine")).toHaveAttribute("lang", "hi");
  });
  it("renders nothing for empty text", () => {
    const { container } = render(<T v={{ en: " " }} lang="both" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`src/InvitationModule/sections/Countdown.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import Countdown from "./Countdown";

describe("<Countdown>", () => {
  it("shows the remaining days and hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-02T13:30:00Z"));
    render(<Countdown target={Date.parse("2026-12-04T13:30:00Z")} lang="en" />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("timer")).toHaveTextContent("02Days00Hours00Minutes00Seconds");
  });
  it("shows a message instead of negative numbers after the date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-05T00:00:00Z"));
    render(<Countdown target={Date.parse("2026-12-04T13:30:00Z")} lang="en" />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByText("The celebrations have begun!")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
```

`src/InvitationModule/sections/OpeningOverlay.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import OpeningOverlay, { CLOSE_MS } from "./OpeningOverlay";

describe("<OpeningOverlay>", () => {
  it("locks scrolling, calls onOpen once, then unmounts", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(
      <OpeningOverlay className="o" closingClassName="closing" onOpen={onOpen}>
        {(open) => <button onClick={open}>Open</button>}
      </OpeningOverlay>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(screen.getByText("Open"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveClass("closing");
    act(() => vi.advanceTimersByTime(CLOSE_MS));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
```

`src/InvitationModule/sections/reveals/reveals.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TapReveal from "./TapReveal";
import EnvelopeReveal, { ENVELOPE_MS } from "./EnvelopeReveal";
import ScrollReveal from "./ScrollReveal";
import ScratchReveal from "./ScratchReveal";

describe("reveals", () => {
  it("TapReveal reveals on click", () => {
    const onReveal = vi.fn();
    render(<TapReveal onReveal={onReveal}>Tap</TapReveal>);
    fireEvent.click(screen.getByRole("button"));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("EnvelopeReveal opens, then reveals once after the animation", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    render(<EnvelopeReveal onReveal={onReveal} label="Open the invitation" />);
    const button = screen.getByRole("button", { name: "Open the invitation" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute("data-open", "true");
    expect(onReveal).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(ENVELOPE_MS));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("ScrollReveal reveals on downward wheel or click, only once", () => {
    const onReveal = vi.fn();
    render(<ScrollReveal onReveal={onReveal}>Scroll</ScrollReveal>);
    fireEvent.wheel(window, { deltaY: -20 });
    expect(onReveal).not.toHaveBeenCalled();
    fireEvent.wheel(window, { deltaY: 40 });
    fireEvent.click(screen.getByRole("button"));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("ScratchReveal can be revealed with the fallback button", () => {
    const onReveal = vi.fn();
    render(
      <ScratchReveal onReveal={onReveal} hint="or tap here">
        <p>04 · 12 · 2026</p>
      </ScratchReveal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "or tap here" }));
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("04 · 12 · 2026")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/sections`
Expected: FAIL — unresolved component imports.

- [ ] **Step 3: Implement `Text.jsx` and `Emblem.jsx`**

`src/InvitationModule/sections/Text.jsx`:

```jsx
import { isDevanagari, textFor } from "../lib/i18n";

// Localised text. For "both", English comes first and Hindi follows on its own line.
export default function T({ v, lang, as: Tag = "span", className }) {
  if (lang === "both") {
    const en = v?.en?.trim();
    const hi = v?.hi?.trim();
    if (!en && !hi) return null;
    if (!en || !hi) {
      const only = en || hi;
      return (
        <Tag className={className} lang={isDevanagari(only) ? "hi" : undefined}>
          {only}
        </Tag>
      );
    }
    return (
      <Tag className={className}>
        {en}
        <span className="hiLine" lang="hi">
          {hi}
        </span>
      </Tag>
    );
  }
  const text = textFor(v, lang);
  if (!text) return null;
  return (
    <Tag className={className} lang={isDevanagari(text) ? "hi" : undefined}>
      {text}
    </Tag>
  );
}
```

`src/InvitationModule/sections/Emblem.jsx`:

```jsx
const CENTRE = { ganesh: "श्री गणेशाय नमः", om: "ॐ" };
const PETAL_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);

// Original typographic emblem: a petal ring around the invocation word.
export default function Emblem({ deity, className }) {
  if (!CENTRE[deity]) return null;
  return (
    <svg className={className} viewBox="0 0 200 200" role="img" aria-label={deity === "om" ? "Om" : "Shri Ganeshaya Namah"}>
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="54" fill="none" stroke="currentColor" strokeWidth="1" />
      {PETAL_ANGLES.map((deg) => (
        <path
          key={deg}
          d="M100 10 C110 24 110 36 100 44 C90 36 90 24 100 10 Z"
          fill="currentColor"
          opacity="0.85"
          transform={`rotate(${deg} 100 100)`}
        />
      ))}
      <text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={deity === "om" ? 60 : 14}
        lang="hi"
        style={{ fontFamily: "var(--font-hindi), serif" }}
      >
        {CENTRE[deity]}
      </text>
    </svg>
  );
}
```

- [ ] **Step 4: Implement `Countdown.jsx` and `OpeningOverlay.jsx`**

`src/InvitationModule/sections/Countdown.jsx`:

```jsx
"use client";
import { useEffect, useState } from "react";
import { timeLeft } from "../lib/countdown";
import { UI } from "../lib/ui-strings";
import T from "./Text";

const UNITS = ["days", "hours", "minutes", "seconds"];

export default function Countdown({ target, lang, s = {} }) {
  // null until mounted so server and client HTML match.
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : timeLeft(target, now);
  if (left?.done) return <T as="p" v={UI.begun} lang={lang} className={s.countDone} />;

  return (
    <div className={s.countdown} role="timer" aria-live="off">
      {UNITS.map((unit) => (
        <div key={unit} className={s.countItem}>
          <span className={s.countNum}>{left ? String(left[unit]).padStart(2, "0") : "--"}</span>
          <T v={UI[unit]} lang={lang} className={s.countLabel} />
        </div>
      ))}
    </div>
  );
}
```

`src/InvitationModule/sections/OpeningOverlay.jsx`:

```jsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const CLOSE_MS = 700;

// Full-screen cover shown until the guest performs the template's reveal gesture.
export default function OpeningOverlay({ className, closingClassName, onOpen, label = "Invitation cover", children }) {
  const [phase, setPhase] = useState("shown");
  const opened = useRef(false);

  const open = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    setPhase("closing");
    onOpen?.();
    setTimeout(() => setPhase("gone"), CLOSE_MS);
  }, [onOpen]);

  useEffect(() => {
    if (phase === "gone") return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      className={[className, phase === "closing" && closingClassName].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children(open)}
    </div>
  );
}
```

- [ ] **Step 5: Implement the four reveals**

`src/InvitationModule/sections/reveals/TapReveal.jsx`:

```jsx
"use client";

export default function TapReveal({ onReveal, className, children }) {
  return (
    <button type="button" className={className} onClick={onReveal}>
      {children}
    </button>
  );
}
```

`src/InvitationModule/sections/reveals/EnvelopeReveal.jsx`:

```jsx
"use client";
import { useRef, useState } from "react";

export const ENVELOPE_MS = 900;

// Template CSS animates children via the [data-open="true"] attribute.
export default function EnvelopeReveal({ onReveal, className, label, children }) {
  const [open, setOpen] = useState(false);
  const done = useRef(false);

  function handleClick() {
    if (done.current) return;
    done.current = true;
    setOpen(true);
    setTimeout(() => onReveal?.(), ENVELOPE_MS);
  }

  return (
    <button type="button" className={className} data-open={open} aria-label={label} onClick={handleClick}>
      {children}
    </button>
  );
}
```

`src/InvitationModule/sections/reveals/ScrollReveal.jsx`:

```jsx
"use client";
import { useEffect, useRef } from "react";

const SWIPE_PX = 30;
const KEYS = ["ArrowDown", "PageDown", " ", "Enter"];

export default function ScrollReveal({ onReveal, className, children }) {
  const fired = useRef(false);
  const fire = useRef(() => {});
  fire.current = () => {
    if (fired.current) return;
    fired.current = true;
    onReveal?.();
  };

  useEffect(() => {
    let startY = null;
    const onWheel = (e) => e.deltaY > 0 && fire.current();
    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (startY !== null && startY - e.touches[0].clientY > SWIPE_PX) fire.current();
    };
    const onKey = (e) => KEYS.includes(e.key) && fire.current();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <button type="button" className={className} onClick={() => fire.current()}>
      {children}
    </button>
  );
}
```

`src/InvitationModule/sections/reveals/ScratchReveal.jsx`:

```jsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const BRUSH_RADIUS = 24;
const REVEAL_AT = 0.5;
const CHECK_EVERY_MOVES = 8;
const SAMPLE_STRIDE = 16;
const FALLBACK_COLOUR = "#c9a54c";

function clearedRatio(ctx, width, height) {
  if (!width || !height) return 0;
  const { data } = ctx.getImageData(0, 0, width, height);
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 4 * SAMPLE_STRIDE) {
    total += 1;
    if (data[i] === 0) clear += 1;
  }
  return total ? clear / total : 0;
}

// Scratch-card cover painted in the palette's --accent; a visible button reveals without scratching.
export default function ScratchReveal({ onReveal, className, surfaceClassName, buttonClassName, hint, children }) {
  const canvasRef = useRef(null);
  const moves = useRef(0);
  const doneRef = useRef(false);
  const [done, setDone] = useState(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    onReveal?.();
  }, [onReveal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--accent").trim() || FALLBACK_COLOUR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function scratch(e) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    moves.current += 1;
    if (moves.current % CHECK_EVERY_MOVES === 0 && clearedRatio(ctx, canvas.width, canvas.height) >= REVEAL_AT) finish();
  }

  return (
    <div className={className}>
      <div className={surfaceClassName} style={{ position: "relative" }}>
        <div aria-hidden={!done}>{children}</div>
        {!done && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            onPointerDown={scratch}
            onPointerMove={(e) => (e.buttons || e.pointerType === "touch") && scratch(e)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
          />
        )}
      </div>
      {!done && (
        <button type="button" className={buttonClassName} onClick={finish}>
          {hint}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement music**

`src/InvitationModule/sections/useMusic.js`:

```js
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const tryPlay = (audio) => Promise.resolve(audio.play());

export default function useMusic(src) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!src) return undefined;
    const a = new Audio(src);
    a.loop = true;
    a.preload = "none";
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    audio.current = a;
    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      audio.current = null;
    };
  }, [src]);

  // Browsers only allow audio after a tap; if this gesture didn't count (e.g. a scroll), retry on the next tap.
  const play = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    tryPlay(a).catch(() => {
      window.addEventListener("pointerdown", () => tryPlay(a).catch(() => {}), { once: true });
    });
  }, []);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) tryPlay(a).catch(() => {});
    else a.pause();
  }, []);

  return { enabled: Boolean(src), playing, play, toggle };
}
```

`src/InvitationModule/sections/MuteButton.jsx`:

```jsx
"use client";

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path fill="currentColor" d="M16.5 12a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z" />
      )}
    </svg>
  );
}

export default function MuteButton({ playing, onToggle, className }) {
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      aria-label={playing ? "Pause music" : "Play music"}
      aria-pressed={playing}
    >
      <SpeakerIcon muted={!playing} />
    </button>
  );
}
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/InvitationModule/sections
git commit -m "feat(invitations): add localised text, countdown, opening overlay, reveals and music"
```

---

### Task 6: Interactive sections — gallery, film, calendar, share, RSVP form

**Files:**
- Create: `src/InvitationModule/sections/Gallery.jsx` (+ `Gallery.test.jsx`)
- Create: `src/InvitationModule/sections/Film.jsx` (+ `Film.test.jsx`)
- Create: `src/InvitationModule/sections/AddToCalendar.jsx`
- Create: `src/InvitationModule/sections/WhatsAppShare.jsx` (+ `WhatsAppShare.test.jsx`)
- Create: `src/InvitationModule/sections/RsvpForm.jsx` (+ `RsvpForm.test.jsx`)

**Interfaces:**
- Consumes: `mediaUrl`, `youtubeId`, `plainText`, `googleCalendarUrl`, `buildIcs`, `shareableUrl`, `whatsappShareUrl`, `validateRsvpInput`, `UI`, `<T>`.
- Produces:
  - `<Gallery items={[{key, caption?}]} lang s />` — classes `galleryGrid, galleryItem, lightbox, lightboxImage, lbClose, lbPrev, lbNext`.
  - `<Film film title s />` — classes `filmFacade, playIcon, filmFrame`.
  - `<AddToCalendar entry={{title, date, time?, location, details}} lang s />` — classes `calLinks, calLink`.
  - `<WhatsAppShare message lang s />` — class `shareBtn`.
  - `<RsvpForm lang events askGuestCount askMeal closed closedOnText deadlineText contactPhone onSubmit s />` where `onSubmit(payload) → Promise<{ok: boolean, message?: string}>` and `payload = {name, phone, attending, guestCount?, eventIds, meal?, message?, website}`.

- [ ] **Step 1: Write failing tests**

`src/InvitationModule/sections/Gallery.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import Gallery from "./Gallery";

const items = [
  { key: "https://x.test/1.jpg", caption: { en: "Engagement" } },
  { key: "https://x.test/2.jpg" },
  { key: "https://x.test/3.jpg" },
];

describe("<Gallery>", () => {
  it("opens the lightbox, wraps around, and closes with Escape", () => {
    render(<Gallery items={items} lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Open Engagement" }));
    const viewer = screen.getByRole("dialog", { name: "Photo viewer" });
    expect(within(viewer).getByRole("img")).toHaveAttribute("src", "https://x.test/1.jpg");
    fireEvent.click(within(viewer).getByRole("button", { name: "Previous photo" }));
    expect(within(viewer).getByRole("img")).toHaveAttribute("src", "https://x.test/3.jpg");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(viewer).getByRole("img")).toHaveAttribute("src", "https://x.test/1.jpg");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

`src/InvitationModule/sections/Film.test.jsx`:

```jsx
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Film from "./Film";

describe("<Film>", () => {
  it("shows a YouTube thumbnail until tapped, then the player", () => {
    render(<Film film={{ type: "youtube", url: "https://youtu.be/abcdefghijk" }} title="The invitation film" />);
    expect(document.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "The invitation film" }));
    expect(screen.getByTitle("The invitation film")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0",
    );
  });
  it("renders nothing for an unusable link", () => {
    const { container } = render(<Film film={{ type: "youtube", url: "https://vimeo.com/1" }} title="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`src/InvitationModule/sections/WhatsAppShare.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WhatsAppShare from "./WhatsAppShare";

describe("<WhatsAppShare>", () => {
  it("shares the general link without the guest code", () => {
    window.history.pushState({}, "", "/invitation/a-weds-b?g=k9f2");
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WhatsAppShare message="Aarohi & Vihaan" lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Share on WhatsApp" }));
    const sharedText = decodeURIComponent(open.mock.calls[0][0].split("text=")[1]);
    expect(sharedText).toBe("Aarohi & Vihaan\nhttp://localhost:3000/invitation/a-weds-b");
    open.mockRestore();
  });
});
```

`src/InvitationModule/sections/RsvpForm.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpForm from "./RsvpForm";

const events = [
  { id: "sangeet", name: { en: "Sangeet" } },
  { id: "vivah", name: { en: "Vivah" } },
];
const base = { lang: "en", events, askGuestCount: true, askMeal: false, closed: false, contactPhone: "+91 98765 43210" };

describe("<RsvpForm>", () => {
  it("shows a closed notice with the family's phone instead of the form", () => {
    render(<RsvpForm {...base} closed closedOnText="Saturday, 31 October 2026" onSubmit={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("RSVPs closed on Saturday, 31 October 2026");
    expect(screen.getByRole("link", { name: "+91 98765 43210" })).toHaveAttribute("href", "tel:+91 98765 43210");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows validation errors and does not submit", async () => {
    const onSubmit = vi.fn();
    render(<RsvpForm {...base} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(screen.getAllByText("This field is required")).toHaveLength(2);
    expect(screen.getByText("Enter a valid phone number")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a complete response and thanks the guest", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(<RsvpForm {...base} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "Sharma Parivar");
    await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
    await userEvent.click(screen.getByLabelText("Joyfully accept"));
    await userEvent.clear(screen.getByLabelText("Number of guests"));
    await userEvent.type(screen.getByLabelText("Number of guests"), "3");
    await userEvent.click(screen.getByLabelText("Sangeet"));
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sharma Parivar",
      phone: "9876543210",
      attending: "yes",
      guestCount: 3,
      eventIds: ["sangeet"],
      meal: undefined,
      message: undefined,
      website: "",
    });
    expect(await screen.findByText("Thank you! Your response has been received.")).toBeInTheDocument();
  });

  it("hides guest count and events when declining", async () => {
    render(<RsvpForm {...base} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Regretfully decline"));
    expect(screen.queryByLabelText("Number of guests")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sangeet")).not.toBeInTheDocument();
  });

  it("shows the server's message when submission fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: "RSVP opens once this invitation is published." });
    render(<RsvpForm {...base} askGuestCount={false} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "Gupta Ji");
    await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
    await userEvent.click(screen.getByLabelText("Not sure yet"));
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("RSVP opens once this invitation is published.");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/sections`
Expected: FAIL — unresolved `./Gallery`, `./Film`, `./WhatsAppShare`, `./RsvpForm`.

- [ ] **Step 3: Implement `Gallery.jsx` and `Film.jsx`**

`src/InvitationModule/sections/Gallery.jsx`:

```jsx
"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { mediaUrl } from "../lib/media";
import { plainText } from "../lib/i18n";

export default function Gallery({ items, lang, s = {} }) {
  const [index, setIndex] = useState(null);
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta) => setIndex((i) => (i === null ? i : (i + delta + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (index === null) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, step]);

  const altFor = (item, i) => plainText(item.caption, lang) || `Photo ${i + 1}`;

  return (
    <>
      <div className={s.galleryGrid}>
        {items.map((item, i) => (
          <button key={item.key} type="button" className={s.galleryItem} onClick={() => setIndex(i)} aria-label={`Open ${altFor(item, i)}`}>
            <Image src={mediaUrl(item.key)} alt={altFor(item, i)} fill sizes="(max-width: 640px) 50vw, 300px" />
          </button>
        ))}
      </div>
      {index !== null && (
        <div className={s.lightbox} role="dialog" aria-modal="true" aria-label="Photo viewer">
          <div className={s.lightboxImage}>
            <Image src={mediaUrl(items[index].key)} alt={altFor(items[index], index)} fill sizes="92vw" />
          </div>
          <button type="button" className={s.lbClose} onClick={close} aria-label="Close">
            ×
          </button>
          {items.length > 1 && (
            <>
              <button type="button" className={s.lbPrev} onClick={() => step(-1)} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className={s.lbNext} onClick={() => step(1)} aria-label="Next photo">
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
```

`src/InvitationModule/sections/Film.jsx`:

```jsx
"use client";
import { useState } from "react";
import { mediaUrl, youtubeId } from "../lib/media";

// YouTube loads only after a tap (thumbnail facade); uploads never preload.
export default function Film({ film, title, s = {} }) {
  const [playing, setPlaying] = useState(false);
  if (!film) return null;

  if (film.type === "upload") {
    const src = mediaUrl(film.key);
    return src ? <video className={s.filmFrame} src={src} controls preload="none" playsInline /> : null;
  }

  const id = youtubeId(film.url);
  if (!id) return null;
  if (!playing) {
    return (
      <button type="button" className={s.filmFacade} onClick={() => setPlaying(true)} aria-label={title}>
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
        <span className={s.playIcon} aria-hidden="true">
          ▶
        </span>
      </button>
    );
  }
  return (
    <iframe
      className={s.filmFrame}
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
```

- [ ] **Step 4: Implement `AddToCalendar.jsx` and `WhatsAppShare.jsx`**

`src/InvitationModule/sections/AddToCalendar.jsx`:

```jsx
"use client";
import { buildIcs, googleCalendarUrl } from "../lib/calendar";
import { UI } from "../lib/ui-strings";
import T from "./Text";

const REVOKE_AFTER_MS = 1000;

export default function AddToCalendar({ entry, lang, s = {} }) {
  const href = googleCalendarUrl(entry);
  if (!href) return null;

  function downloadIcs() {
    const blob = new Blob([buildIcs([entry])], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.title.replace(/[^\w\- ]+/g, "").trim() || "event"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
  }

  return (
    <div className={s.calLinks}>
      <a href={href} target="_blank" rel="noopener noreferrer" className={s.calLink}>
        <T v={UI.addToCalendar} lang={lang} />
      </a>
      <button type="button" className={s.calLink} onClick={downloadIcs}>
        <T v={UI.downloadIcs} lang={lang} />
      </button>
    </div>
  );
}
```

`src/InvitationModule/sections/WhatsAppShare.jsx`:

```jsx
"use client";
import { shareableUrl, whatsappShareUrl } from "../lib/share";
import { UI } from "../lib/ui-strings";
import T from "./Text";

export default function WhatsAppShare({ message, lang, s = {} }) {
  function share() {
    const url = shareableUrl(window.location.href);
    window.open(whatsappShareUrl(`${message}\n${url}`), "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" className={s.shareBtn} onClick={share}>
      <T v={UI.share} lang={lang} />
    </button>
  );
}
```

- [ ] **Step 5: Implement `RsvpForm.jsx`**

`src/InvitationModule/sections/RsvpForm.jsx`:

```jsx
"use client";
import { useState } from "react";
import { UI } from "../lib/ui-strings";
import { plainText } from "../lib/i18n";
import { validateRsvpInput } from "../lib/rsvp";
import T from "./Text";

const EMPTY = { name: "", phone: "", attending: "", guestCount: "1", eventIds: [], meal: "", message: "", website: "" };
const HONEYPOT_STYLE = { position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" };

export default function RsvpForm({
  lang,
  events,
  askGuestCount,
  askMeal,
  closed,
  closedOnText,
  deadlineText,
  contactPhone,
  onSubmit,
  s = {},
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: "idle" });

  if (closed) {
    return (
      <p className={s.rsvpClosed} role="status">
        <T v={UI.rsvpClosed} lang={lang} /> {closedOnText}.{" "}
        {contactPhone && (
          <>
            <T v={UI.rsvpContact} lang={lang} /> <a href={`tel:${contactPhone}`}>{contactPhone}</a>
          </>
        )}
      </p>
    );
  }
  if (status.state === "done") return <T as="p" v={UI.thanks} lang={lang} className={s.rsvpThanks} />;

  const attendingNow = values.attending !== "no";
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const toggleEvent = (id) =>
    setValues((v) => ({
      ...v,
      eventIds: v.eventIds.includes(id) ? v.eventIds.filter((x) => x !== id) : [...v.eventIds, id],
    }));
  const fieldError = (field) =>
    errors[field] ? <T as="span" v={UI.errors[errors[field]]} lang={lang} className={s.fieldError} /> : null;

  async function submit(e) {
    e.preventDefault();
    const found = validateRsvpInput(values, { askGuestCount });
    setErrors(found);
    if (Object.keys(found).length) return;
    setStatus({ state: "sending" });
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      attending: values.attending,
      guestCount: askGuestCount && attendingNow ? Number(values.guestCount) : undefined,
      eventIds: attendingNow ? values.eventIds : [],
      meal: askMeal && attendingNow ? values.meal || undefined : undefined,
      message: values.message.trim() || undefined,
      website: values.website,
    };
    try {
      const result = await onSubmit(payload);
      setStatus(result?.ok ? { state: "done" } : { state: "error", message: result?.message || plainText(UI.rsvpFailed, lang) });
    } catch {
      setStatus({ state: "error", message: plainText(UI.rsvpFailed, lang) });
    }
  }

  return (
    <form className={s.rsvpForm} onSubmit={submit} noValidate>
      {deadlineText && (
        <p className={s.rsvpDeadline}>
          <T v={UI.rsvpBy} lang={lang} /> {deadlineText}
        </p>
      )}
      <label className={s.field}>
        <T v={UI.name} lang={lang} />
        <input name="name" value={values.name} onChange={set("name")} autoComplete="name" />
        {fieldError("name")}
      </label>
      <label className={s.field}>
        <T v={UI.phone} lang={lang} />
        <input name="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" />
        {fieldError("phone")}
      </label>
      <fieldset className={s.field}>
        <legend>
          <T v={UI.attending} lang={lang} />
        </legend>
        {["yes", "no", "maybe"].map((option) => (
          <label key={option} className={s.choice}>
            <input type="radio" name="attending" value={option} checked={values.attending === option} onChange={set("attending")} />
            <T v={UI[option]} lang={lang} />
          </label>
        ))}
        {fieldError("attending")}
      </fieldset>
      {attendingNow && askGuestCount && (
        <label className={s.field}>
          <T v={UI.guests} lang={lang} />
          <input name="guestCount" type="number" min="1" max="20" inputMode="numeric" value={values.guestCount} onChange={set("guestCount")} />
          {fieldError("guestCount")}
        </label>
      )}
      {attendingNow && events.length > 1 && (
        <fieldset className={s.field}>
          <legend>
            <T v={UI.whichEvents} lang={lang} />
          </legend>
          {events.map((ev) => (
            <label key={ev.id} className={s.choice}>
              <input type="checkbox" checked={values.eventIds.includes(ev.id)} onChange={() => toggleEvent(ev.id)} />
              <T v={ev.name} lang={lang} />
            </label>
          ))}
        </fieldset>
      )}
      {attendingNow && askMeal && (
        <label className={s.field}>
          <T v={UI.meal} lang={lang} />
          <select name="meal" value={values.meal} onChange={set("meal")}>
            <option value="">—</option>
            <option value="veg">{plainText(UI.mealVeg, lang)}</option>
            <option value="nonveg">{plainText(UI.mealNonVeg, lang)}</option>
            <option value="jain">{plainText(UI.mealJain, lang)}</option>
          </select>
        </label>
      )}
      <label className={s.field}>
        <T v={UI.message} lang={lang} />
        <textarea name="message" rows={3} value={values.message} onChange={set("message")} />
      </label>
      <div aria-hidden="true" style={HONEYPOT_STYLE}>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
        </label>
      </div>
      {status.state === "error" && (
        <p role="alert" className={s.fieldError}>
          {status.message}
        </p>
      )}
      <button type="submit" className={s.button} disabled={status.state === "sending"}>
        <T v={status.state === "sending" ? UI.sending : UI.submit} lang={lang} />
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/InvitationModule/sections
git commit -m "feat(invitations): add gallery, film, calendar, WhatsApp share and RSVP form"
```

---

### Task 7: Template frame, renderer, registry, and the Royal Rajasthani template

**Files:**
- Create: `src/InvitationModule/templates/fonts.js`
- Create: `src/InvitationModule/templates/sample-base.js`
- Create: `src/InvitationModule/templates/base/BaseSections.jsx`
- Create: `src/InvitationModule/templates/base/TemplateFrame.jsx`
- Create: `src/InvitationModule/templates/base/base.module.scss`
- Create: `src/InvitationModule/templates/royal/index.jsx`, `palettes.js`, `sample.js`, `royal.module.scss`
- Create: `src/InvitationModule/templates/registry.js` (+ `registry.test.jsx`)
- Create: `src/InvitationModule/InvitationRenderer.jsx`, `src/InvitationModule/invitation.module.scss`

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces:
  - `fontVariables: string` (all font CSS-variable classes).
  - `makeSample({templateId, palette, language, bride: {en, hi}, groom: {en, hi}}) → raw invitation`.
  - `CoverBase({inv, lang, s})`, `SECTION_COMPONENTS: {[sectionId]: Component({inv, lang, s, ctx})}`.
  - `TemplateFrame({inv, ctx, s, Cover?, Opening})` where `Opening({inv, lang, s, open})`.
  - Template entry shape: `{ id, name, description, Component({invitation, ctx}), palettes: [{id, name, vars}], fontVars, sample }`.
  - `TEMPLATES`, `getTemplate(id) → entry | null`, `getPalette(entry, paletteId) → palette`, `themeStyle(entry, paletteId) → style object`.
  - `<InvitationRenderer invitation ctx? />` (server-safe; `ctx.mode === "preview"` makes RSVP answer with the preview message).
  - Shared class names every template module may override: see `base.module.scss`.

- [ ] **Step 1: Write the failing registry/render test**

`src/InvitationModule/templates/registry.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { getPalette, getTemplate, TEMPLATES, themeStyle } from "./registry";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { visibleSections } from "../lib/sections";
import { minimalInvitation } from "../testing/fixtures";

const build = (template, overrides = {}) =>
  parseInvitation({ ...template.sample, ...overrides, theme: { ...template.sample.theme, ...overrides.theme } });

const renderedOrder = (container) => [...container.querySelectorAll("[data-section]")].map((el) => el.dataset.section);

describe("registry lookups", () => {
  it("returns null for an unknown template", () => {
    expect(getTemplate("neon")).toBeNull();
  });
  it("falls back to the first palette for an unknown palette", () => {
    const royal = getTemplate("royal");
    expect(getPalette(royal, "missing")).toBe(royal.palettes[0]);
  });
  it("builds a style object with palette and font variables", () => {
    const royal = getTemplate("royal");
    const style = themeStyle(royal, royal.palettes[1].id);
    expect(style["--bg"]).toBe(royal.palettes[1].vars["--bg"]);
    expect(style["--font-display"]).toBeDefined();
  });
});

describe.each(TEMPLATES.map((t) => [t.id, t]))("template %s", (_id, template) => {
  it("has a valid sample whose palette exists", () => {
    const inv = build(template);
    expect(template.palettes.map((p) => p.id)).toContain(inv.theme.palette);
    expect(inv.templateId).toBe(template.id);
  });

  it.each(template.palettes.map((p) => [p.id]))("renders every visible section with palette %s", (paletteId) => {
    const inv = build(template, { theme: { palette: paletteId } });
    const { container } = render(<InvitationRenderer invitation={inv} ctx={{ mode: "preview" }} />);
    expect(renderedOrder(container)).toEqual(visibleSections(inv));
    expect(container.textContent).not.toContain("undefined");
  });

  it("renders Hindi-only without English labels or undefined", () => {
    const inv = build(template, { language: "hi" });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(container.textContent).toContain(inv.couple.bride.name.hi);
    expect(container.textContent).not.toContain("Save the Date");
    expect(container.textContent).not.toContain("undefined");
  });

  it("renders both languages", () => {
    const inv = build(template, { language: "both" });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(container.textContent).toContain(inv.couple.bride.name.en);
    expect(container.textContent).toContain(inv.couple.bride.name.hi);
  });

  it("omits sections that have no content", () => {
    const inv = parseInvitation({ ...minimalInvitation(), templateId: template.id, theme: { palette: template.palettes[0].id } });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(renderedOrder(container)).toEqual(["invocation", "couple", "saveTheDate", "countdown", "venue"]);
  });

  it("renders an event without a time", () => {
    const inv = build(template, { events: [{ id: "haldi", name: { en: "Haldi" }, date: "2027-02-12" }] });
    render(<InvitationRenderer invitation={inv} />);
    expect(screen.getByText("Haldi")).toBeInTheDocument();
  });

  it("dismisses the opening with a tap or click", () => {
    vi.useFakeTimers();
    render(<InvitationRenderer invitation={build(template)} />);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    fireEvent.click(within(cover).getByRole("button"));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).not.toBeInTheDocument();
  });

  it("hides the credit when showCredit is false", () => {
    const { container, rerender } = render(<InvitationRenderer invitation={build(template)} />);
    expect(container.textContent).toContain("Created by Baba Saab Events");
    rerender(<InvitationRenderer invitation={build(template, { showCredit: false })} />);
    expect(container.textContent).not.toContain("Created by Baba Saab Events");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/templates`
Expected: FAIL — cannot resolve `./registry`.

- [ ] **Step 3: Create fonts and the shared sample**

`src/InvitationModule/templates/fonts.js`:

```js
import {
  Cinzel_Decorative,
  Cormorant_Garamond,
  Great_Vibes,
  Inter,
  Lora,
  Marcellus,
  Playfair_Display,
  Tiro_Devanagari_Hindi,
} from "next/font/google";

// preload:false — a font file downloads only when a template's CSS actually uses it.
const common = { display: "swap", preload: false };

const cinzel = Cinzel_Decorative({ ...common, subsets: ["latin"], weight: ["400", "700"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({ ...common, subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });
const greatVibes = Great_Vibes({ ...common, subsets: ["latin"], weight: "400", variable: "--font-greatvibes" });
const lora = Lora({ ...common, subsets: ["latin"], variable: "--font-lora" });
const marcellus = Marcellus({ ...common, subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const playfair = Playfair_Display({ ...common, subsets: ["latin"], variable: "--font-playfair" });
const inter = Inter({ ...common, subsets: ["latin"], variable: "--font-inter" });
const hindi = Tiro_Devanagari_Hindi({ ...common, subsets: ["devanagari", "latin"], weight: "400", variable: "--font-hindi" });

export const fontVariables = [cinzel, cormorant, greatVibes, lora, marcellus, playfair, inter, hindi]
  .map((f) => f.variable)
  .join(" ");
```

`src/InvitationModule/templates/sample-base.js`:

```js
const GALLERY = [
  "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1530023367847-a683933f4172?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1623788452350-4c8596ff40bb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1595407753234-0882f1e77954?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
];

// Sample invitation shown in the template gallery. Every section has content so staff see the full design.
export function makeSample({ templateId, palette, language, bride, groom }) {
  return {
    templateId,
    theme: { palette },
    status: "draft",
    language,
    couple: {
      bride: { name: bride, parentsLine: { en: "D/o Smt. Sunita & Shri Rajesh Sharma", hi: "सुपुत्री श्रीमती सुनीता एवं श्री राजेश शर्मा" } },
      groom: { name: groom, parentsLine: { en: "S/o Smt. Kavita & Shri Anil Mehra", hi: "सुपुत्र श्रीमती कविता एवं श्री अनिल मेहरा" } },
    },
    hosts: {
      closingLine: {
        en: "With love and blessings from the Sharma and Mehra families",
        hi: "शर्मा एवं मेहरा परिवार की ओर से सप्रेम",
      },
      families: [
        { en: "Smt. Sunita & Shri Rajesh Sharma", hi: "श्रीमती सुनीता एवं श्री राजेश शर्मा" },
        { en: "Smt. Kavita & Shri Anil Mehra", hi: "श्रीमती कविता एवं श्री अनिल मेहरा" },
      ],
      contactPhone: "+91 98765 43210",
    },
    invocation: { deity: "ganesh", presetId: "vakratunda" },
    mainDate: "2027-02-14",
    venue: {
      name: { en: "Sheesh Mahal Gardens", hi: "शीश महल गार्डन्स" },
      address: { en: "Amer Road, Jaipur, Rajasthan", hi: "आमेर रोड, जयपुर, राजस्थान" },
      mapsUrl: "https://maps.google.com/?q=Amer+Road+Jaipur",
      travelNotes: {
        en: "Jaipur International Airport is 25 km away.\nJaipur Junction railway station is 12 km away.\nFebruary evenings are cool — carry a light shawl.",
        hi: "जयपुर अंतरराष्ट्रीय हवाई अड्डा 25 किमी दूर है।\nजयपुर जंक्शन रेलवे स्टेशन 12 किमी दूर है।\nफ़रवरी की शामें ठंडी होती हैं — हल्की शॉल साथ रखें।",
      },
    },
    events: [
      { id: "haldi", name: { en: "Haldi", hi: "हल्दी" }, date: "2027-02-12", time: "10:00", dressCode: { en: "Shades of yellow", hi: "पीले रंग" } },
      { id: "mehendi", name: { en: "Mehendi", hi: "मेहंदी" }, date: "2027-02-12", time: "16:00", dressCode: { en: "Green and pastels", hi: "हरा और हल्के रंग" } },
      { id: "sangeet", name: { en: "Sangeet", hi: "संगीत" }, date: "2027-02-13", time: "19:30", description: { en: "An evening of music and dance", hi: "संगीत और नृत्य की एक शाम" } },
      { id: "vivah", name: { en: "Vivah", hi: "विवाह" }, date: "2027-02-14", time: "19:00", dressCode: { en: "Traditional", hi: "पारंपरिक" } },
      { id: "reception", name: { en: "Reception", hi: "स्वागत समारोह" }, date: "2027-02-15", time: "20:00" },
    ],
    media: {
      coverKey: GALLERY[2],
      gallery: GALLERY.map((key, i) => ({ key, caption: i === 0 ? { en: "Where it began", hi: "जहाँ से शुरुआत हुई" } : undefined })),
    },
    rsvp: { enabled: true, deadline: "2027-01-31", askGuestCount: true, askMeal: true },
    showCredit: true,
  };
}
```

- [ ] **Step 4: Create `BaseSections.jsx`**

`src/InvitationModule/templates/base/BaseSections.jsx`:

```jsx
"use client";
import Image from "next/image";
import T from "../../sections/Text";
import Emblem from "../../sections/Emblem";
import Countdown from "../../sections/Countdown";
import Gallery from "../../sections/Gallery";
import Film from "../../sections/Film";
import AddToCalendar from "../../sections/AddToCalendar";
import RsvpForm from "../../sections/RsvpForm";
import WhatsAppShare from "../../sections/WhatsAppShare";
import { UI } from "../../lib/ui-strings";
import { hasText, plainText } from "../../lib/i18n";
import { invocationText } from "../../lib/invocations";
import { formatDate, formatDots, formatTime } from "../../lib/datetime";
import { countdownTarget } from "../../lib/countdown";
import { mediaUrl } from "../../lib/media";
import { isRsvpClosed } from "../../lib/rsvp";
import { coupleTitle } from "../../lib/names";

const dateLang = (lang) => (lang === "hi" ? "hi" : "en");
const previewRsvp = (lang) => async () => ({ ok: false, message: plainText(UI.rsvpPreview, lang) });

function Section({ id, s, title, lang, children }) {
  return (
    <section className={[s.section, s[`section_${id}`]].filter(Boolean).join(" ")} data-section={id} aria-labelledby={title ? `sec-${id}` : undefined}>
      {title && (
        <h2 id={`sec-${id}`} className={s.sectionTitle}>
          <T v={title} lang={lang} />
        </h2>
      )}
      {children}
    </section>
  );
}

export function CoverBase({ inv, lang, s }) {
  const { bride, groom } = inv.couple;
  return (
    <header className={s.cover}>
      {inv.media.coverKey && (
        <div className={s.coverImage}>
          <Image src={mediaUrl(inv.media.coverKey)} alt="" fill priority sizes="100vw" />
        </div>
      )}
      <div className={s.coverContent}>
        <T as="p" v={UI.weddingOf} lang={lang} className={s.eyebrow} />
        <h1 className={s.coverNames}>
          <T v={bride.name} lang={lang} className={s.name} />
          <span className={s.amp}>&amp;</span>
          <T v={groom.name} lang={lang} className={s.name} />
        </h1>
        <p className={s.coverDate}>{formatDots(inv.mainDate)}</p>
      </div>
    </header>
  );
}

function Invocation({ inv, lang, s }) {
  return (
    <Section id="invocation" s={s}>
      <Emblem deity={inv.invocation.deity} className={s.emblem} />
      <T as="p" v={invocationText(inv.invocation)} lang={lang} className={s.invocationText} />
    </Section>
  );
}

function Couple({ inv, lang, s }) {
  return (
    <Section id="couple" s={s}>
      <T as="p" v={UI.together} lang={lang} className={s.eyebrow} />
      <div className={s.couple}>
        {[inv.couple.bride, inv.couple.groom].map((person, i) => (
          <div key={i} className={s.person}>
            {person.photoKey && (
              <div className={s.personPhoto}>
                <Image src={mediaUrl(person.photoKey)} alt={plainText(person.name, lang)} fill sizes="160px" />
              </div>
            )}
            <T as="h3" v={person.name} lang={lang} className={s.personName} />
            <T as="p" v={person.parentsLine} lang={lang} className={s.parents} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function SaveTheDate({ inv, lang, s }) {
  return (
    <Section id="saveTheDate" s={s} title={UI.saveTheDate} lang={lang}>
      <p className={s.bigDate}>{formatDots(inv.mainDate)}</p>
      <p className={s.longDate} lang={lang === "hi" ? "hi" : undefined}>
        {formatDate(inv.mainDate, dateLang(lang))}
      </p>
      {lang === "both" && (
        <p className={s.longDate} lang="hi">
          {formatDate(inv.mainDate, "hi")}
        </p>
      )}
    </Section>
  );
}

function CountdownSection({ inv, lang, s }) {
  return (
    <Section id="countdown" s={s} title={UI.countdown} lang={lang}>
      <Countdown target={countdownTarget(inv)} lang={lang} s={s} />
    </Section>
  );
}

function Venue({ inv, lang, s }) {
  const { venue } = inv;
  return (
    <Section id="venue" s={s} title={UI.venue} lang={lang}>
      <T as="h3" v={venue.name} lang={lang} className={s.venueName} />
      <T as="p" v={venue.address} lang={lang} className={s.address} />
      {venue.mapsUrl && (
        <a className={s.button} href={venue.mapsUrl} target="_blank" rel="noopener noreferrer">
          <T v={UI.openMap} lang={lang} />
        </a>
      )}
    </Section>
  );
}

function Travel({ inv, lang, s }) {
  return (
    <Section id="travel" s={s} title={UI.travel} lang={lang}>
      <T as="p" v={inv.venue.travelNotes} lang={lang} className={s.travelNotes} />
    </Section>
  );
}

function Schedule({ inv, lang, s }) {
  const title = coupleTitle(inv);
  return (
    <Section id="schedule" s={s} title={UI.schedule} lang={lang}>
      <ol className={s.events}>
        {inv.events.map((ev) => {
          const venueName = hasText(ev.venueName) ? ev.venueName : inv.venue.name;
          const address = hasText(ev.address) ? ev.address : inv.venue.address;
          const mapsUrl = ev.mapsUrl ?? inv.venue.mapsUrl;
          const time = formatTime(ev.time, dateLang(lang));
          return (
            <li key={ev.id} className={s.event}>
              <T as="h3" v={ev.name} lang={lang} className={s.eventName} />
              <p className={s.eventMeta}>
                {formatDate(ev.date, dateLang(lang))}
                {time && ` · ${time}`}
              </p>
              <T as="p" v={venueName} lang={lang} className={s.eventVenue} />
              {hasText(ev.dressCode) && (
                <p className={s.eventDress}>
                  <T v={UI.dressCode} lang={lang} />: <T v={ev.dressCode} lang={lang} />
                </p>
              )}
              <T as="p" v={ev.description} lang={lang} className={s.eventDesc} />
              {mapsUrl && (
                <a className={s.calLink} href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <T v={UI.openMap} lang={lang} />
                </a>
              )}
              <AddToCalendar
                entry={{
                  title: `${plainText(ev.name, "en")} — ${title}`,
                  date: ev.date,
                  time: ev.time,
                  location: [plainText(venueName, "en"), plainText(address, "en")].filter(Boolean).join(", "),
                  details: title,
                }}
                lang={lang}
                s={s}
              />
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function GallerySection({ inv, lang, s }) {
  return (
    <Section id="gallery" s={s} title={UI.gallery} lang={lang}>
      <Gallery items={inv.media.gallery} lang={lang} s={s} />
    </Section>
  );
}

function FilmSection({ inv, lang, s }) {
  return (
    <Section id="film" s={s} title={UI.film} lang={lang}>
      <Film film={inv.media.film} title={plainText(UI.film, lang)} s={s} />
    </Section>
  );
}

function Rsvp({ inv, lang, s, ctx }) {
  const deadline = inv.rsvp.deadline ? formatDate(inv.rsvp.deadline, dateLang(lang)) : null;
  const onSubmit = ctx.mode === "preview" || !ctx.onRsvpSubmit ? previewRsvp(lang) : ctx.onRsvpSubmit;
  return (
    <Section id="rsvp" s={s} title={UI.rsvp} lang={lang}>
      <RsvpForm
        lang={lang}
        events={inv.events}
        askGuestCount={inv.rsvp.askGuestCount}
        askMeal={inv.rsvp.askMeal}
        closed={isRsvpClosed(inv.rsvp)}
        closedOnText={deadline}
        deadlineText={deadline}
        contactPhone={inv.hosts.contactPhone}
        onSubmit={onSubmit}
        s={s}
      />
    </Section>
  );
}

function Closing({ inv, lang, s }) {
  const { hosts } = inv;
  return (
    <Section id="closing" s={s}>
      <T as="p" v={UI.closing} lang={lang} className={s.eyebrow} />
      <T as="p" v={hosts.closingLine} lang={lang} className={s.closingLine} />
      {hosts.families.length > 0 && (
        <ul className={s.families}>
          {hosts.families.map((family, i) => (
            <T key={i} as="li" v={family} lang={lang} />
          ))}
        </ul>
      )}
      {hosts.contactPhone && (
        <a className={s.contact} href={`tel:${hosts.contactPhone}`}>
          {hosts.contactPhone}
        </a>
      )}
      <WhatsAppShare message={`${coupleTitle(inv)} · ${formatDots(inv.mainDate)}`} lang={lang} s={s} />
    </Section>
  );
}

export const SECTION_COMPONENTS = {
  invocation: Invocation,
  couple: Couple,
  saveTheDate: SaveTheDate,
  countdown: CountdownSection,
  venue: Venue,
  travel: Travel,
  schedule: Schedule,
  gallery: GallerySection,
  film: FilmSection,
  rsvp: Rsvp,
  closing: Closing,
};
```

- [ ] **Step 5: Create `TemplateFrame.jsx`**

`src/InvitationModule/templates/base/TemplateFrame.jsx`:

```jsx
"use client";
import OpeningOverlay from "../../sections/OpeningOverlay";
import MuteButton from "../../sections/MuteButton";
import useMusic from "../../sections/useMusic";
import T from "../../sections/Text";
import { CoverBase, SECTION_COMPONENTS } from "./BaseSections";
import { visibleSections } from "../../lib/sections";
import { musicSrc } from "../../lib/media";
import { UI } from "../../lib/ui-strings";

// Shared page skeleton: opening overlay, cover, visible sections in order, credit, music control.
export default function TemplateFrame({ inv, ctx = {}, s, Cover = CoverBase, Opening }) {
  const lang = inv.language;
  const music = useMusic(musicSrc(inv.media.music));

  return (
    <div className={s.root} data-template={inv.templateId}>
      <OpeningOverlay className={s.opening} closingClassName={s.openingClosing} onOpen={music.play}>
        {(open) => <Opening inv={inv} lang={lang} s={s} open={open} />}
      </OpeningOverlay>
      <main className={s.main}>
        <Cover inv={inv} lang={lang} s={s} />
        {visibleSections(inv).map((id) => {
          const SectionComponent = SECTION_COMPONENTS[id];
          return <SectionComponent key={id} inv={inv} lang={lang} s={s} ctx={ctx} />;
        })}
      </main>
      {inv.showCredit && (
        <footer className={s.credit}>
          <T v={UI.credit} lang={lang} />
        </footer>
      )}
      {music.enabled && <MuteButton playing={music.playing} onToggle={music.toggle} className={s.muteBtn} />}
    </div>
  );
}
```

- [ ] **Step 6: Create the shared stylesheet**

`src/InvitationModule/templates/base/base.module.scss`:

```scss
// Shared layout for all templates. Colours and fonts come only from CSS variables set by the palette.
.root {
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body), Georgia, serif;
  font-size: 17px;
  line-height: 1.6;
  overflow-x: hidden;
}
.main { max-width: 640px; margin: 0 auto; padding: 0 20px 48px; }

.opening {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--bg);
  color: var(--text);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.openingClosing { opacity: 0; transform: scale(1.04); pointer-events: none; }
.openingInner { width: 100%; max-width: 420px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.openingEmblem { width: 96px; height: 96px; color: var(--primary); }
.openingNames { font-family: var(--font-display), serif; font-size: clamp(28px, 8vw, 40px); line-height: 1.2; overflow-wrap: anywhere; }
.openingHint { color: var(--muted); font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; }
.linkButton { background: none; border: 0; color: var(--primary); text-decoration: underline; font: inherit; font-size: 15px; cursor: pointer; min-height: 44px; padding: 8px 12px; }

.cover { position: relative; min-height: 92vh; display: grid; place-items: center; text-align: center; padding: 48px 0; }
.coverImage { position: absolute; inset: 0; opacity: 0.22; img { object-fit: cover; } }
.coverContent { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.eyebrow { color: var(--muted); font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase; }
.coverNames {
  font-family: var(--font-display), serif;
  font-weight: 400;
  font-size: clamp(40px, 12vw, 72px);
  line-height: 1.1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-wrap: anywhere;
}
.amp { font-size: 0.6em; color: var(--primary); margin: 4px 0; }
.coverDate { font-size: 20px; letter-spacing: 0.3em; color: var(--primary); }

.section { padding: 48px 0; text-align: center; border-top: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); }
.sectionTitle { font-family: var(--font-display), serif; font-weight: 400; font-size: clamp(26px, 7vw, 36px); color: var(--primary); margin-bottom: 24px; }
.emblem { width: 120px; height: 120px; margin: 0 auto 16px; color: var(--primary); }
.invocationText { white-space: pre-line; font-size: 18px; }
.couple { display: grid; gap: 32px; margin-top: 16px; }
.person { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.personPhoto { position: relative; width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 3px solid var(--primary); img { object-fit: cover; } }
.personName { font-family: var(--font-display), serif; font-weight: 400; font-size: 32px; overflow-wrap: anywhere; }
.parents { color: var(--muted); font-size: 15px; }
.bigDate { font-family: var(--font-display), serif; font-size: clamp(32px, 10vw, 52px); color: var(--primary); letter-spacing: 0.08em; }
.longDate { color: var(--muted); }

.countdown { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.countItem {
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: 12px;
  padding: 14px 4px;
  display: flex;
  flex-direction: column;
}
.countNum { font-family: var(--font-display), serif; font-size: 30px; color: var(--primary); font-variant-numeric: tabular-nums; }
.countLabel { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.countDone { font-size: 20px; color: var(--primary); }

.venueName { font-family: var(--font-display), serif; font-weight: 400; font-size: 26px; }
.address { color: var(--muted); margin-bottom: 20px; }
.travelNotes { white-space: pre-line; text-align: left; }

.events { list-style: none; display: grid; gap: 20px; text-align: left; padding: 0; }
.event { background: var(--surface); border-radius: 16px; padding: 20px; border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); }
.eventName { font-family: var(--font-display), serif; font-weight: 400; font-size: 24px; color: var(--primary); }
.eventMeta { font-weight: 600; }
.eventVenue, .eventDesc, .eventDress { color: var(--muted); font-size: 15px; }
.calLinks { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.calLink {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font: inherit;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--primary);
  color: var(--primary);
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  margin-top: 8px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  font: inherit;
  font-size: 15px;
  padding: 10px 22px;
  border-radius: 999px;
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  text-decoration: none;
  &:disabled { opacity: 0.6; cursor: wait; }
}
.shareBtn { composes: button; margin-top: 8px; }

.galleryGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.galleryItem { position: relative; aspect-ratio: 1; border: 0; padding: 0; border-radius: 12px; overflow: hidden; cursor: zoom-in; background: var(--surface); img { object-fit: cover; } }
.lightbox { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.92); display: grid; place-items: center; }
.lightboxImage { position: relative; width: 92vw; height: 80vh; img { object-fit: contain; } }
.lbClose, .lbPrev, .lbNext {
  position: absolute;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 0;
  border-radius: 999px;
  width: 48px;
  height: 48px;
  font-size: 28px;
  cursor: pointer;
}
.lbClose { top: 16px; right: 16px; }
.lbPrev { left: 12px; top: 50%; transform: translateY(-50%); }
.lbNext { right: 12px; top: 50%; transform: translateY(-50%); }

.filmFacade { position: relative; width: 100%; aspect-ratio: 16 / 9; border: 0; padding: 0; border-radius: 16px; overflow: hidden; cursor: pointer; background: #000; img { width: 100%; height: 100%; object-fit: cover; } }
.playIcon { position: absolute; inset: 0; display: grid; place-items: center; font-size: 48px; color: #fff; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5); }
.filmFrame { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 16px; }

.rsvpForm { display: grid; gap: 16px; text-align: left; }
.field {
  display: grid;
  gap: 6px;
  border: 0;
  padding: 0;
  input, select, textarea {
    font: inherit;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--text) 25%, transparent);
    background: var(--surface);
    color: var(--text);
    min-height: 44px;
  }
  legend { margin-bottom: 6px; }
}
.choice { display: flex; gap: 10px; align-items: center; min-height: 44px; input { width: 20px; height: 20px; min-height: 0; accent-color: var(--primary); } }
.fieldError { color: var(--error, #e5484d); font-size: 14px; }
.rsvpDeadline, .rsvpClosed { color: var(--muted); }
.rsvpThanks { font-size: 20px; color: var(--primary); }

.closingLine { font-size: 18px; margin: 8px 0 16px; }
.families { list-style: none; padding: 0; display: grid; gap: 4px; color: var(--muted); margin-bottom: 16px; }
.contact { display: inline-block; color: var(--primary); margin-bottom: 12px; }
.credit { text-align: center; font-size: 12px; color: var(--muted); padding: 24px 0 32px; }
.muteBtn {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 40;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 0;
  background: var(--primary);
  color: var(--on-primary);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .opening { transition: none; }
}
```

- [ ] **Step 7: Create the Royal template**

`src/InvitationModule/templates/royal/palettes.js`:

```js
export const royalFontVars = {
  "--font-display": "var(--font-cinzel)",
  "--font-body": "var(--font-cormorant)",
};

export const royalPalettes = [
  {
    id: "maroon-gold",
    name: "Maroon & Gold",
    vars: { "--bg": "#4a0e17", "--surface": "#5c1520", "--text": "#f8e7c9", "--muted": "#d9bf94", "--primary": "#c9a54c", "--accent": "#e6c77a", "--on-primary": "#3a0a12" },
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    vars: { "--bg": "#0f1d3d", "--surface": "#172a55", "--text": "#f3e9d2", "--muted": "#c5b78f", "--primary": "#c9a54c", "--accent": "#e8cf86", "--on-primary": "#0f1d3d" },
  },
  {
    id: "emerald",
    name: "Emerald",
    vars: { "--bg": "#0d3b2e", "--surface": "#12493a", "--text": "#f5ead0", "--muted": "#cbbd92", "--primary": "#d4af37", "--accent": "#ecd27f", "--on-primary": "#0d3b2e" },
  },
];
```

`src/InvitationModule/templates/royal/sample.js`:

```js
import { makeSample } from "../sample-base";

export const royalSample = makeSample({
  templateId: "royal",
  palette: "maroon-gold",
  language: "both",
  bride: { en: "Aarohi", hi: "आरोही" },
  groom: { en: "Vihaan", hi: "विहान" },
});
```

`src/InvitationModule/templates/royal/royal.module.scss`:

```scss
.root { background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--primary) 18%, var(--bg)) 0%, var(--bg) 60%); }
.opening { background: radial-gradient(circle at 50% 30%, var(--surface), var(--bg)); }
.archFrame {
  position: relative;
  margin-top: 24px;
  border: 2px solid var(--primary);
  border-radius: 50% 50% 16px 16px / 28% 28% 16px 16px;
  padding: 0 16px;
  &::before {
    content: "";
    position: absolute;
    inset: 8px;
    border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent);
    border-radius: inherit;
    pointer-events: none;
  }
}
.sectionTitle {
  letter-spacing: 0.06em;
  &::after { content: "❖"; display: block; font-size: 14px; margin-top: 8px; color: var(--accent); }
}
.scratch { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.scratchSurface { width: min(260px, 80vw); height: 90px; border-radius: 14px; overflow: hidden; border: 2px solid var(--primary); background: var(--surface); }
.scratchDate { height: 90px; display: grid; place-items: center; font-family: var(--font-display), serif; font-size: 26px; letter-spacing: 0.12em; color: var(--accent); }
.event { border-color: color-mix(in srgb, var(--primary) 55%, transparent); }
```

`src/InvitationModule/templates/royal/index.jsx`:

```jsx
"use client";
import base from "../base/base.module.scss";
import own from "./royal.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import ScratchReveal from "../../sections/reveals/ScratchReveal";
import Emblem from "../../sections/Emblem";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { formatDots } from "../../lib/datetime";
import { plainText } from "../../lib/i18n";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);
// Let the guest see the revealed date before the cover fades.
const REVEAL_PAUSE_MS = 1200;

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <Emblem deity={inv.invocation.deity} className={s.openingEmblem} />
      <p className={s.openingNames}>
        <T v={inv.couple.bride.name} lang={lang} /> <span className={s.amp}>&amp;</span> <T v={inv.couple.groom.name} lang={lang} />
      </p>
      <T as="p" v={UI.scratchHint} lang={lang} className={s.openingHint} />
      <ScratchReveal
        className={s.scratch}
        surfaceClassName={s.scratchSurface}
        buttonClassName={s.linkButton}
        hint={plainText(UI.revealNow, lang)}
        onReveal={() => setTimeout(open, REVEAL_PAUSE_MS)}
      >
        <p className={s.scratchDate}>{formatDots(inv.mainDate)}</p>
      </ScratchReveal>
    </div>
  );
}

function Cover(props) {
  return (
    <div className={s.archFrame}>
      <CoverBase {...props} />
    </div>
  );
}

export default function RoyalTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />;
}
```

- [ ] **Step 8: Create the registry and renderer**

`src/InvitationModule/templates/registry.js`:

```js
import RoyalTemplate from "./royal";
import { royalFontVars, royalPalettes } from "./royal/palettes";
import { royalSample } from "./royal/sample";

export const TEMPLATES = [
  {
    id: "royal",
    name: "Royal Rajasthani",
    description: "Maroon and gold with a palace-arch frame. Guests scratch a gold card to reveal the date.",
    Component: RoyalTemplate,
    palettes: royalPalettes,
    fontVars: royalFontVars,
    sample: royalSample,
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getPalette(template, paletteId) {
  return template.palettes.find((p) => p.id === paletteId) ?? template.palettes[0];
}

export function themeStyle(template, paletteId) {
  return { ...template.fontVars, ...getPalette(template, paletteId).vars };
}
```

`src/InvitationModule/invitation.module.scss`:

```scss
.wrapper {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  :global(.hiLine) { display: block; margin-top: 0.2em; }
  [lang="hi"] { font-family: var(--font-hindi), serif; }
}
```

`src/InvitationModule/InvitationRenderer.jsx`:

```jsx
import { fontVariables } from "./templates/fonts";
import { getTemplate, themeStyle } from "./templates/registry";
import styles from "./invitation.module.scss";

// Server-safe entry point: picks the template, applies palette and font variables.
export default function InvitationRenderer({ invitation, ctx = {} }) {
  const template = getTemplate(invitation.templateId);
  if (!template) return null;
  const { Component } = template;
  return (
    <div className={`${fontVariables} ${styles.wrapper}`} style={themeStyle(template, invitation.theme.palette)}>
      <Component invitation={invitation} ctx={ctx} />
    </div>
  );
}
```

- [ ] **Step 9: Run tests**

Run: `npm test`
Expected: PASS. The `template royal` block runs once per palette plus the language, sparse, no-time, opening and credit tests.

- [ ] **Step 10: Commit**

```bash
git add src/InvitationModule
git commit -m "feat(invitations): add template frame, renderer, registry and Royal Rajasthani template"
```

---

### Task 8: Floral Pastel template

**Files:**
- Create: `src/InvitationModule/templates/floral/index.jsx`, `palettes.js`, `sample.js`, `floral.module.scss`
- Modify: `src/InvitationModule/templates/registry.js` (add entry)

**Interfaces:**
- Consumes: `TemplateFrame`, `CoverBase`, `ScrollReveal`, `<T>`, `UI`, `mergeStyles`, `makeSample`, base styles.
- Produces: registry entry `floral` with palettes `blush-sage`, `lavender`, `peach`.

- [ ] **Step 1: Register the template first so the test fails**

In `src/InvitationModule/templates/registry.js` add imports and an entry after `royal`:

```js
import FloralTemplate from "./floral";
import { floralFontVars, floralPalettes } from "./floral/palettes";
import { floralSample } from "./floral/sample";
```

```js
  {
    id: "floral",
    name: "Floral Pastel",
    description: "Soft watercolour florals in pastel tones. The cover opens with a gentle scroll.",
    Component: FloralTemplate,
    palettes: floralPalettes,
    fontVars: floralFontVars,
    sample: floralSample,
  },
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/templates`
Expected: FAIL — cannot resolve `./floral`.

- [ ] **Step 3: Implement**

`src/InvitationModule/templates/floral/palettes.js`:

```js
export const floralFontVars = {
  "--font-display": "var(--font-greatvibes)",
  "--font-body": "var(--font-lora)",
};

export const floralPalettes = [
  {
    id: "blush-sage",
    name: "Blush & Sage",
    vars: { "--bg": "#fdf6f3", "--surface": "#ffffff", "--text": "#4a3f3c", "--muted": "#7d6e69", "--primary": "#b8606e", "--accent": "#9bb59a", "--on-primary": "#ffffff", "--error": "#b42318" },
  },
  {
    id: "lavender",
    name: "Lavender",
    vars: { "--bg": "#f7f4fb", "--surface": "#ffffff", "--text": "#3f3a4a", "--muted": "#756e82", "--primary": "#7d62a6", "--accent": "#c9a8d8", "--on-primary": "#ffffff", "--error": "#b42318" },
  },
  {
    id: "peach",
    name: "Peach",
    vars: { "--bg": "#fff7f0", "--surface": "#ffffff", "--text": "#4b3a2f", "--muted": "#806b5b", "--primary": "#bf6f42", "--accent": "#f0b98f", "--on-primary": "#ffffff", "--error": "#b42318" },
  },
];
```

`src/InvitationModule/templates/floral/sample.js`:

```js
import { makeSample } from "../sample-base";

export const floralSample = makeSample({
  templateId: "floral",
  palette: "blush-sage",
  language: "en",
  bride: { en: "Ishita", hi: "इशिता" },
  groom: { en: "Kabir", hi: "कबीर" },
});
```

`src/InvitationModule/templates/floral/floral.module.scss`:

```scss
.root {
  background-image:
    radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--primary) 16%, transparent) 0, transparent 40%),
    radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--accent) 22%, transparent) 0, transparent 45%);
}
.opening { background: linear-gradient(180deg, var(--bg), color-mix(in srgb, var(--primary) 12%, var(--bg))); }
.scrollOpen { background: none; border: 0; color: inherit; font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 16px; }
.openingNames { font-size: clamp(44px, 13vw, 64px); color: var(--primary); }
.scrollHint { color: var(--muted); font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; animation: bob 1.6s ease-in-out infinite; }
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
.coverNames { color: var(--primary); }
.sectionTitle { font-size: clamp(34px, 9vw, 44px); }
.section { border-top: 0; }
.event { border: 0; border-radius: 24px; box-shadow: 0 6px 24px color-mix(in srgb, var(--primary) 12%, transparent); }
.floralCorner { position: absolute; width: 140px; height: 140px; color: var(--accent); opacity: 0.7; pointer-events: none; }
.cornerTopLeft { top: 0; left: -20px; }
.cornerBottomRight { bottom: 0; right: -20px; transform: rotate(180deg); }
.floralCover { position: relative; }
@media (prefers-reduced-motion: reduce) {
  .scrollHint { animation: none; }
}
```

`src/InvitationModule/templates/floral/index.jsx`:

```jsx
"use client";
import base from "../base/base.module.scss";
import own from "./floral.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import ScrollReveal from "../../sections/reveals/ScrollReveal";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { formatDots } from "../../lib/datetime";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);
const LEAF_ANGLES = [-60, -30, 0, 30, 60];

function FloralCorner({ className }) {
  return (
    <svg className={className} viewBox="0 0 140 140" aria-hidden="true">
      <path d="M10 130 Q 60 80 130 10" fill="none" stroke="currentColor" strokeWidth="2" />
      {LEAF_ANGLES.map((deg, i) => (
        <ellipse key={deg} cx={30 + i * 20} cy={110 - i * 20} rx="14" ry="6" fill="currentColor" transform={`rotate(${deg} ${30 + i * 20} ${110 - i * 20})`} />
      ))}
      <circle cx="120" cy="20" r="9" fill="currentColor" />
    </svg>
  );
}

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <ScrollReveal className={s.scrollOpen} onReveal={open}>
        <T as="span" v={UI.weddingOf} lang={lang} className={s.eyebrow} />
        <span className={s.openingNames}>
          <T v={inv.couple.bride.name} lang={lang} /> &amp; <T v={inv.couple.groom.name} lang={lang} />
        </span>
        <span className={s.coverDate}>{formatDots(inv.mainDate)}</span>
        <T as="span" v={UI.scrollToOpen} lang={lang} className={s.scrollHint} />
      </ScrollReveal>
    </div>
  );
}

function Cover(props) {
  return (
    <div className={s.floralCover}>
      <FloralCorner className={`${s.floralCorner} ${s.cornerTopLeft}`} />
      <CoverBase {...props} />
      <FloralCorner className={`${s.floralCorner} ${s.cornerBottomRight}`} />
    </div>
  );
}

export default function FloralTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, including the new `template floral` block.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/templates
git commit -m "feat(invitations): add Floral Pastel template"
```

---

### Task 9: Temple Classic template

**Files:**
- Create: `src/InvitationModule/templates/temple/index.jsx`, `palettes.js`, `sample.js`, `temple.module.scss`
- Modify: `src/InvitationModule/templates/registry.js` (add entry)

**Interfaces:**
- Consumes: `TemplateFrame`, `CoverBase`, `EnvelopeReveal`, `<T>`, `UI`, `plainText`, `monogram`, `mergeStyles`, `makeSample`.
- Produces: registry entry `temple` with palettes `kumkum`, `banana-leaf`, `temple-gold`.

- [ ] **Step 1: Register the template first so the test fails**

In `registry.js` add:

```js
import TempleTemplate from "./temple";
import { templeFontVars, templePalettes } from "./temple/palettes";
import { templeSample } from "./temple/sample";
```

```js
  {
    id: "temple",
    name: "Temple Classic",
    description: "Temple motifs and kolam borders in rich traditional colours. Guests tap a sealed envelope to open it.",
    Component: TempleTemplate,
    palettes: templePalettes,
    fontVars: templeFontVars,
    sample: templeSample,
  },
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/templates`
Expected: FAIL — cannot resolve `./temple`.

- [ ] **Step 3: Implement**

`src/InvitationModule/templates/temple/palettes.js`:

```js
export const templeFontVars = {
  "--font-display": "var(--font-marcellus)",
  "--font-body": "var(--font-cormorant)",
};

export const templePalettes = [
  {
    id: "kumkum",
    name: "Kumkum & Haldi",
    vars: { "--bg": "#fff8e8", "--surface": "#fffdf6", "--text": "#3b1f0e", "--muted": "#6e4e33", "--primary": "#a3221b", "--accent": "#d9a21b", "--on-primary": "#fff8e8", "--error": "#a3221b" },
  },
  {
    id: "banana-leaf",
    name: "Banana Leaf",
    vars: { "--bg": "#f4f7ec", "--surface": "#fffef8", "--text": "#1f2e14", "--muted": "#56644a", "--primary": "#2f6b2f", "--accent": "#c99a1b", "--on-primary": "#ffffff", "--error": "#b42318" },
  },
  {
    id: "temple-gold",
    name: "Temple Gold",
    vars: { "--bg": "#2b1608", "--surface": "#3a1f0c", "--text": "#f6e3b5", "--muted": "#cdb07a", "--primary": "#e0a526", "--accent": "#f2c94c", "--on-primary": "#2b1608" },
  },
];
```

`src/InvitationModule/templates/temple/sample.js`:

```js
import { makeSample } from "../sample-base";

export const templeSample = makeSample({
  templateId: "temple",
  palette: "kumkum",
  language: "both",
  bride: { en: "Meera", hi: "मीरा" },
  groom: { en: "Arjun", hi: "अर्जुन" },
});
```

`src/InvitationModule/templates/temple/temple.module.scss`:

```scss
.root { background-image: repeating-linear-gradient(45deg, color-mix(in srgb, var(--accent) 7%, transparent) 0 2px, transparent 2px 14px); }
.kolam {
  height: 18px;
  width: 100%;
  background: radial-gradient(circle, var(--primary) 2.5px, transparent 3px) 0 0 / 18px 18px repeat-x;
  opacity: 0.8;
}
.envelope {
  position: relative;
  width: min(320px, 86vw);
  aspect-ratio: 3 / 2;
  border: 0;
  padding: 0;
  background: var(--primary);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  perspective: 800px;
}
.flap {
  position: absolute;
  inset: 0 0 auto 0;
  height: 60%;
  background: color-mix(in srgb, var(--primary) 82%, black);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: top;
  transition: transform 0.8s ease;
  z-index: 2;
}
.letter {
  position: absolute;
  inset: 10% 8% 8%;
  background: var(--surface);
  color: var(--text);
  border-radius: 6px;
  display: grid;
  place-items: center;
  padding: 12px;
  font-family: var(--font-display), serif;
  font-size: 20px;
  transition: transform 0.8s ease 0.2s;
  z-index: 1;
}
.seal {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-primary);
  display: grid;
  place-items: center;
  font-family: var(--font-display), serif;
  font-size: 18px;
  z-index: 3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: opacity 0.3s;
}
.envelope[data-open="true"] .flap { transform: rotateX(180deg); z-index: 0; }
.envelope[data-open="true"] .letter { transform: translateY(-40%); }
.envelope[data-open="true"] .seal { opacity: 0; }
.tapHint { color: var(--muted); font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; }
.sectionTitle { text-transform: uppercase; letter-spacing: 0.12em; }
.event { border-left: 4px solid var(--accent); }
@media (prefers-reduced-motion: reduce) {
  .flap, .letter, .seal { transition: none; }
}
```

`src/InvitationModule/templates/temple/index.jsx`:

```jsx
"use client";
import base from "../base/base.module.scss";
import own from "./temple.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import EnvelopeReveal from "../../sections/reveals/EnvelopeReveal";
import Emblem from "../../sections/Emblem";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { plainText } from "../../lib/i18n";
import { monogram } from "../../lib/names";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <Emblem deity={inv.invocation.deity} className={s.openingEmblem} />
      <EnvelopeReveal className={s.envelope} label={plainText(UI.tapToOpen, lang)} onReveal={open}>
        <span className={s.flap} />
        <span className={s.letter}>
          <T v={inv.couple.bride.name} lang={lang} /> &amp; <T v={inv.couple.groom.name} lang={lang} />
        </span>
        <span className={s.seal} aria-hidden="true">
          {monogram(inv)}
        </span>
      </EnvelopeReveal>
      <T as="p" v={UI.tapToOpen} lang={lang} className={s.tapHint} />
    </div>
  );
}

function Cover(props) {
  return (
    <>
      <div className={s.kolam} aria-hidden="true" />
      <CoverBase {...props} />
      <div className={s.kolam} aria-hidden="true" />
    </>
  );
}

export default function TempleTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, including `template temple`.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/templates
git commit -m "feat(invitations): add Temple Classic template"
```

---

### Task 10: Modern Minimal template

**Files:**
- Create: `src/InvitationModule/templates/minimal/index.jsx`, `palettes.js`, `sample.js`, `minimal.module.scss`
- Modify: `src/InvitationModule/templates/registry.js` (add entry)

**Interfaces:**
- Consumes: `TemplateFrame`, `CoverBase`, `TapReveal`, `<T>`, `UI`, `monogram`, `mergeStyles`, `makeSample`.
- Produces: registry entry `minimal` with palettes `ivory`, `midnight`, `sage`. The registry now lists all 4 templates in order royal, floral, temple, minimal.

- [ ] **Step 1: Register the template first so the test fails**

In `registry.js` add:

```js
import MinimalTemplate from "./minimal";
import { minimalFontVars, minimalPalettes } from "./minimal/palettes";
import { minimalSample } from "./minimal/sample";
```

```js
  {
    id: "minimal",
    name: "Modern Minimal",
    description: "A monogram cover and clean typography. Suits receptions and destination weddings. Tap to reveal.",
    Component: MinimalTemplate,
    palettes: minimalPalettes,
    fontVars: minimalFontVars,
    sample: minimalSample,
  },
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/InvitationModule/templates`
Expected: FAIL — cannot resolve `./minimal`.

- [ ] **Step 3: Implement**

`src/InvitationModule/templates/minimal/palettes.js`:

```js
export const minimalFontVars = {
  "--font-display": "var(--font-playfair)",
  "--font-body": "var(--font-inter)",
};

export const minimalPalettes = [
  {
    id: "ivory",
    name: "Ivory",
    vars: { "--bg": "#faf8f4", "--surface": "#ffffff", "--text": "#1d1d1f", "--muted": "#6e6e73", "--primary": "#1d1d1f", "--accent": "#9c7c43", "--on-primary": "#faf8f4", "--error": "#b42318" },
  },
  {
    id: "midnight",
    name: "Midnight",
    vars: { "--bg": "#121417", "--surface": "#1b1e23", "--text": "#f2efe9", "--muted": "#a3a3a8", "--primary": "#f2efe9", "--accent": "#c8a96a", "--on-primary": "#121417" },
  },
  {
    id: "sage",
    name: "Sage",
    vars: { "--bg": "#f3f5f0", "--surface": "#ffffff", "--text": "#22301f", "--muted": "#5d6857", "--primary": "#3c5a3a", "--accent": "#8a9c7c", "--on-primary": "#ffffff", "--error": "#b42318" },
  },
];
```

`src/InvitationModule/templates/minimal/sample.js`:

```js
import { makeSample } from "../sample-base";

export const minimalSample = makeSample({
  templateId: "minimal",
  palette: "ivory",
  language: "en",
  bride: { en: "Tara", hi: "तारा" },
  groom: { en: "Dev", hi: "देव" },
});
```

`src/InvitationModule/templates/minimal/minimal.module.scss`:

```scss
.tapOpen { background: none; border: 0; color: inherit; font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 16px; }
.monogram {
  width: 140px;
  height: 140px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--font-display), serif;
  font-size: 40px;
  letter-spacing: 0.04em;
}
.tapHint { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); }
.coverNames { letter-spacing: -0.01em; }
.amp { font-style: italic; color: var(--accent); }
.section { border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); }
.sectionTitle { color: var(--text); font-family: var(--font-body), sans-serif; font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; }
.event { background: transparent; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--text) 12%, transparent); border-radius: 0; padding: 16px 0; }
.eventName { color: var(--text); }
.countItem { background: transparent; border: 0; }
```

`src/InvitationModule/templates/minimal/index.jsx`:

```jsx
"use client";
import base from "../base/base.module.scss";
import own from "./minimal.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import TapReveal from "../../sections/reveals/TapReveal";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { formatDots } from "../../lib/datetime";
import { monogram } from "../../lib/names";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <TapReveal className={s.tapOpen} onReveal={open}>
        <span className={s.monogram}>{monogram(inv)}</span>
        <span className={s.coverDate}>{formatDots(inv.mainDate)}</span>
        <T as="span" v={UI.tapToOpen} lang={lang} className={s.tapHint} />
      </TapReveal>
    </div>
  );
}

export default function MinimalTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Opening={Opening} />;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, including `template minimal`. `TEMPLATES.map(t => t.id)` is `["royal", "floral", "temple", "minimal"]`.

- [ ] **Step 5: Commit**

```bash
git add src/InvitationModule/templates
git commit -m "feat(invitations): add Modern Minimal template"
```

---

### Task 11: Preview route, admin layout, template gallery and preview page

**Files:**
- Create: `src/app/(invite)/layout.js`
- Create: `src/app/(invite)/preview/template/[templateId]/page.js`
- Create: `src/app/(admin)/layout.js`, `src/app/(admin)/admin/page.js`
- Create: `src/app/(admin)/admin/templates/page.js`, `src/app/(admin)/admin/templates/[templateId]/page.js`
- Create: `src/AdminModule/AdminShell.jsx`, `src/AdminModule/PhoneFrame.jsx`, `src/AdminModule/TemplatePreview.jsx`
- Modify: `docs/admin-guide.md` (created here; expanded in Task 12)

**Interfaces:**
- Consumes: `TEMPLATES`, `getTemplate`, `getPalette`, `parseInvitation`, `LANGUAGES`, `InvitationRenderer`.
- Produces:
  - `GET /preview/template/<id>?palette=<paletteId>&lang=<en|hi|both>` — full-screen sample; unknown template → 404; unknown palette/lang → defaults.
  - `GET /admin` → redirect to `/admin/templates`.
  - `GET /admin/templates`, `GET /admin/templates/<id>`.
  - `<PhoneFrame src title scale />`, `PHONE = {width: 390, height: 844}`.
  - `<AdminShell>` with sidebar links Templates and Help.

- [ ] **Step 1: Create the invite layout and preview route**

`src/app/(invite)/layout.js`:

```js
import "../globals.css";

export const metadata = { robots: { index: false, follow: false } };

export default function InviteLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/(invite)/preview/template/[templateId]/page.js`:

```js
import { notFound } from "next/navigation";
import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import { getPalette, getTemplate } from "@/InvitationModule/templates/registry";
import { LANGUAGES, parseInvitation } from "@/InvitationModule/schema/invitation";

export const metadata = { title: "Template preview", robots: { index: false, follow: false } };

export default function TemplatePreviewPage({ params, searchParams }) {
  const template = getTemplate(params.templateId);
  if (!template) notFound();
  const palette = getPalette(template, searchParams.palette).id;
  const language = LANGUAGES.includes(searchParams.lang) ? searchParams.lang : template.sample.language;
  const invitation = parseInvitation({ ...template.sample, language, theme: { ...template.sample.theme, palette } });
  return <InvitationRenderer invitation={invitation} ctx={{ mode: "preview" }} />;
}
```

- [ ] **Step 2: Create admin components**

`src/AdminModule/AdminShell.jsx`:

```jsx
import Link from "next/link";

const NAV = [
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/help", label: "Help" },
];

export default function AdminShell({ children }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200 bg-white md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 py-4 font-semibold">Baba Saab · Invitations</div>
        <nav className="flex flex-wrap gap-1 px-3 pb-3 md:flex-col" aria-label="Admin">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm hover:bg-stone-100">
              {item.label}
            </Link>
          ))}
          <span className="rounded-md px-3 py-2 text-sm text-stone-400">Invitations · coming soon</span>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
```

`src/AdminModule/PhoneFrame.jsx`:

```jsx
export const PHONE = { width: 390, height: 844 };
const BEZEL = 6;

// Renders a page inside a scaled phone-sized iframe so previews match a real handset.
export default function PhoneFrame({ src, title, scale = 0.6 }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-[28px] bg-stone-900 shadow-lg"
      style={{ width: PHONE.width * scale + BEZEL * 2, height: PHONE.height * scale + BEZEL * 2, padding: BEZEL }}
    >
      <div className="overflow-hidden rounded-[22px]" style={{ width: PHONE.width * scale, height: PHONE.height * scale }}>
        <iframe
          src={src}
          title={title}
          loading="lazy"
          className="origin-top-left bg-white"
          style={{ width: PHONE.width, height: PHONE.height, transform: `scale(${scale})`, border: 0 }}
        />
      </div>
    </div>
  );
}
```

`src/AdminModule/TemplatePreview.jsx`:

```jsx
"use client";
import Link from "next/link";
import { useState } from "react";
import PhoneFrame from "./PhoneFrame";

const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "both", label: "Both" },
];

const chip = (active) =>
  `flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm ${
    active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"
  }`;

export default function TemplatePreview({ templateId, name, description, palettes, defaultLanguage }) {
  const [palette, setPalette] = useState(palettes[0].id);
  const [language, setLanguage] = useState(defaultLanguage);
  const src = `/preview/template/${templateId}?palette=${encodeURIComponent(palette)}&lang=${language}`;

  return (
    <div>
      <Link href="/admin/templates" className="text-sm text-stone-600 hover:underline">
        ← All templates
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{name}</h1>
      <p className="text-stone-600">{description}</p>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col gap-6 lg:w-72">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Palette</legend>
            <div className="flex flex-wrap gap-2">
              {palettes.map((p) => (
                <button key={p.id} type="button" onClick={() => setPalette(p.id)} aria-pressed={palette === p.id} className={chip(palette === p.id)}>
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
                <button key={l.id} type="button" onClick={() => setLanguage(l.id)} aria-pressed={language === l.id} className={chip(language === l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm underline">
            Open full screen ↗
          </a>
          <p className="text-xs text-stone-500">Sample details only. The opening animation replays each time you change a setting.</p>
        </div>
        <PhoneFrame src={src} title={`${name} preview`} scale={0.8} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the admin layout and pages**

`src/app/(admin)/layout.js`:

```js
import "../globals.css";
import AdminShell from "@/AdminModule/AdminShell";

export const metadata = { title: "Baba Saab Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
```

`src/app/(admin)/admin/page.js`:

```js
import { redirect } from "next/navigation";

export default function AdminHome() {
  redirect("/admin/templates");
}
```

`src/app/(admin)/admin/templates/page.js`:

```js
import Link from "next/link";
import PhoneFrame from "@/AdminModule/PhoneFrame";
import { TEMPLATES } from "@/InvitationModule/templates/registry";

export const metadata = { title: "Templates · Baba Saab Admin" };

export default function TemplatesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Templates</h1>
      <p className="mt-1 text-stone-600">Each design shown with sample details. Open one to try its colour palettes and languages.</p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 2xl:grid-cols-4">
        {TEMPLATES.map((t) => (
          <article key={t.id} className="flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <PhoneFrame src={`/preview/template/${t.id}`} title={`${t.name} preview`} scale={0.55} />
            <h2 className="text-lg font-semibold">{t.name}</h2>
            <p className="text-center text-sm text-stone-600">{t.description}</p>
            <ul className="flex gap-2" aria-label={`${t.name} palettes`}>
              {t.palettes.map((p) => (
                <li
                  key={p.id}
                  title={p.name}
                  className="h-6 w-6 rounded-full border border-stone-300"
                  style={{ background: `linear-gradient(135deg, ${p.vars["--bg"]} 50%, ${p.vars["--primary"]} 50%)` }}
                />
              ))}
            </ul>
            <Link href={`/admin/templates/${t.id}`} className="flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white">
              Preview
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
```

`src/app/(admin)/admin/templates/[templateId]/page.js`:

```js
import { notFound } from "next/navigation";
import TemplatePreview from "@/AdminModule/TemplatePreview";
import { getTemplate } from "@/InvitationModule/templates/registry";

export default function TemplateDetailPage({ params }) {
  const template = getTemplate(params.templateId);
  if (!template) notFound();
  return (
    <TemplatePreview
      templateId={template.id}
      name={template.name}
      description={template.description}
      palettes={template.palettes.map((p) => ({ id: p.id, name: p.name, bg: p.vars["--bg"], primary: p.vars["--primary"] }))}
      defaultLanguage={template.sample.language}
    />
  );
}
```

- [ ] **Step 4: Verify with the dev server**

```bash
rm -rf .next && npx next dev -p 3005
```

In a second terminal:

```bash
for p in /admin /admin/templates /admin/templates/royal /admin/templates/floral /admin/templates/temple /admin/templates/minimal \
         "/preview/template/royal?palette=emerald&lang=hi" "/preview/template/minimal?palette=nope&lang=xx" \
         /preview/template/neon /admin/templates/neon / /about; do
  echo "$p $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3005$p")"
done
```

Expected: `/admin` → `307`; `/preview/template/neon` and `/admin/templates/neon` → `404`; every other path → `200` (the `nope`/`xx` preview falls back to defaults).

Then open `http://localhost:3005/admin/templates` in a browser and check, for each template:
- The opening animation works by its own gesture (scratch / scroll / envelope / tap) and by its fallback tap.
- After opening, every section shows; nothing overflows at phone width.
- Changing palette and language on the preview page updates the phone frame.
- Browser console has no errors or React warnings.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(invite)" "src/app/(admin)" src/AdminModule
git commit -m "feat(admin): add template gallery, template preview and sample preview route"
```

---

### Task 12: Help page and staff guide

**Files:**
- Modify: `next.config.js` (import `.md` as a string)
- Create: `docs/admin-guide.md`
- Create: `src/app/(admin)/admin/help/page.js`
- Create: `src/AdminModule/help.module.scss`

**Interfaces:**
- Consumes: `AdminShell` (Task 11).
- Produces: `GET /admin/help` renders `docs/admin-guide.md`. Later phases append guide sections; the page picks them up automatically.

- [ ] **Step 1: Let webpack import Markdown as text**

Replace `next.config.js` with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  webpack(config) {
    // The staff guide in docs/ is bundled into /admin/help as a string.
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

module.exports = nextConfig
```

- [ ] **Step 2: Write the staff guide**

`docs/admin-guide.md`:

```markdown
# Baba Saab Digital Invitations — Staff Guide

This guide grows as new parts of the invitation system go live. Everything described here works today.

## What you can do right now

| Area | What it's for |
|---|---|
| **Templates** | Browse the 4 invitation designs with sample details, try their colour palettes and languages, and show them to customers. |
| **Help** | This guide. |

Creating, publishing and sharing real invitations arrives in the next releases. This guide will gain a section for each one.

## Browsing templates

1. Open **Templates** in the left menu.
2. Each card shows a live phone preview of one design with sample details, its name, a short description and its colour palettes (the small circles).
3. Click **Preview** on a card to open that design.

## Previewing a template with a customer

On a template's preview page:

- **Palette** — tap a palette name to recolour the design. Every template has 3 palettes.
- **Language** — choose **English**, **हिंदी** or **Both**. "Both" shows each line in English with Hindi underneath.
- **Open full screen ↗** — opens the design in a new tab. Use this to show it on a laptop or to send the page to your own phone.
- The opening animation replays every time you change a setting.

> The names, dates and photos are sample details. A customer's own details are added when invitations can be created.

## The four designs

| Template | Look | How guests open it |
|---|---|---|
| **Royal Rajasthani** | Maroon and gold, palace-arch frame | Scratch a gold card to reveal the wedding date (or tap "or tap here") |
| **Floral Pastel** | Soft watercolour florals | Scroll or swipe up (or tap) |
| **Temple Classic** | Temple motifs and kolam borders | Tap the sealed envelope |
| **Modern Minimal** | Monogram cover, clean typography | Tap to reveal |

Every design includes the same sections. Ones without details are hidden automatically:

Invocation (Shri Ganesh / Om and a shloka) · The couple and their parents · Save the date · Live countdown · Venue with Google Maps · Travel notes · Schedule of functions with "Add to calendar" · Photo gallery · Invitation film · RSVP form · Closing message with family names and a WhatsApp share button

## Choosing a template with a customer — tips

- **Ask about the mood first.** Grand and traditional suits Royal Rajasthani or Temple Classic. Soft and romantic suits Floral Pastel. A reception or destination wedding often suits Modern Minimal.
- **Show it on a phone.** Nearly every guest will open the invitation on a phone, so use **Open full screen ↗** on your own phone.
- **Settle the language early.** If elders in the family prefer Hindi, choose **Both**.

## Details to collect from the customer

Gather these before invitations can be created, so the next step is quick:

- Bride's and groom's names (in Hindi too, if they want both languages)
- Parents' names for "D/o…" and "S/o…" lines
- Family names for the closing message, and a contact phone number
- Main wedding date, venue name, full address and a Google Maps link
- Every function: name, date, time, venue (if different), dress code
- Travel notes: nearest airport and railway station, weather tips
- A cover photo and up to about 12 gallery photos
- The invitation film: a YouTube link, or a video file under 100 MB
- Music preference
- Which shloka to show: Ganesh Vandana (वक्रतुण्ड महाकाय…), Shri Ganeshaya Namah, Mangal Shloka, Shubh Vivah, Om, or their own text
- RSVP deadline, and whether to ask for the number of guests and meal preference
- Guest list for personal links (names, and which functions each guest is invited to)
```

- [ ] **Step 3: Create the help page**

`src/AdminModule/help.module.scss`:

```scss
.guide {
  max-width: 760px;
  line-height: 1.65;
  color: #292524;
  h1 { font-size: 28px; font-weight: 600; margin-bottom: 12px; }
  h2 { font-size: 20px; font-weight: 600; margin: 32px 0 10px; }
  p, ul, ol, table, blockquote { margin: 10px 0; }
  ul { list-style: disc; padding-left: 22px; }
  ol { list-style: decimal; padding-left: 22px; }
  li { margin: 4px 0; }
  strong { font-weight: 600; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; display: block; overflow-x: auto; }
  th, td { border: 1px solid #e7e5e4; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f5f5f4; font-weight: 600; }
  blockquote { border-left: 3px solid #d6d3d1; padding: 4px 14px; color: #57534e; background: #fafaf9; }
  a { text-decoration: underline; }
}
```

`src/app/(admin)/admin/help/page.js`:

```js
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import guide from "../../../../../docs/admin-guide.md";
import styles from "@/AdminModule/help.module.scss";

export const metadata = { title: "Help · Baba Saab Admin" };

export default function HelpPage() {
  return (
    <article className={styles.guide}>
      <Markdown remarkPlugins={[remarkGfm]}>{guide}</Markdown>
    </article>
  );
}
```

- [ ] **Step 4: Verify**

```bash
rm -rf .next && npx next dev -p 3005
```

Open `http://localhost:3005/admin/help`. Expected: the guide renders with headings, tables and the quote; the sidebar **Help** link works. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add next.config.js docs/admin-guide.md "src/app/(admin)/admin/help" src/AdminModule/help.module.scss
git commit -m "docs(admin): add staff guide and in-app help page"
```

---

### Task 13: Final verification and handoff

**Files:** none created. This task proves the phase works end to end.

**Interfaces:**
- Consumes: everything above.
- Produces: a green test run, a clean production build, a manual QA record, and the branch ready to push.

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: every test file passes; 0 failures.

- [ ] **Step 2: Production build**

```bash
rm -rf .next && npx next build
```

Expected: `✓ Compiled successfully`; the route table includes `/admin/templates`, `/admin/templates/[templateId]`, `/admin/help`, `/preview/template/[templateId]` and all 37 existing site routes.

- [ ] **Step 3: Production-mode smoke test**

```bash
npx next start -p 3005
```

In a second terminal, rerun the curl loop from Task 11 Step 4 plus `/admin/help`. Expected: same status codes. Stop the server.

- [ ] **Step 4: Manual QA on a phone-sized screen**

With `npm run dev` running, open Chrome DevTools device mode (iPhone 12 Pro and a 360px-wide Android) at each `/preview/template/<id>`, in every palette and in `en`, `hi` and `both`:
- [ ] Opening gesture and fallback tap both work; the page scrolls afterwards.
- [ ] Long text wraps (try the Hindi language with the Temple template).
- [ ] Gallery lightbox opens, swipes with the arrows, closes with ×.
- [ ] RSVP shows "RSVP opens once this invitation is published." on submit.
- [ ] "Add to Google Calendar" opens Google with the right time (IST); ".ics" downloads.
- [ ] WhatsApp share opens `wa.me` with the couple's names and the page link.
- [ ] Turn on "Emulate CSS prefers-reduced-motion: reduce" — animations stop, everything still opens.
- [ ] The console shows no errors or React warnings.

- [ ] **Step 5: Hand off**

Run `git log --oneline main..feature/invitations` and confirm one commit per task. Ask the owner before pushing; pushing the branch only deploys if `feature/invitations` is connected in the Amplify console. When approved:

```bash
git push -u origin feature/invitations
```

Do not merge or cherry-pick to `main`: the `/admin` pages have no login until Phase 0.
