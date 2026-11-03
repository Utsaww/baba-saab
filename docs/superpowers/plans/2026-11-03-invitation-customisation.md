# Invitation Customisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff hide map/calendar buttons per event, pick a date style, rewrite preset wording, replace the countdown with a message, adjust size/bold/italic of key text (all five templates), and set custom colours (Royal, Floral, Minimal).

**Architecture:** All settings are new optional invitation fields; absent = today's rendering. Rendering reads them through small pure helpers (`shortDate`, `uiText`, `textStyleVars`, `paletteVars`) so templates change only at call sites; sizes/weights flow as CSS variables with design fallbacks; custom colours are derived from two hex values and validated by the publish checklist.

**Tech Stack:** Next.js 14 App Router (JS), React, zod, SCSS modules, Vitest 2 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-invitation-customisation-design.md`

## Global Constraints

- Everything ships for all five templates (`royal`, `floral`, `temple`, `minimal`, `velvet`), except custom colours: **only `royal`, `floral`, `minimal`**.
- Absent new fields = today's output exactly. Existing invitations must not change.
- Mobile: at 360px width nothing overflows or overlaps, at every size step, with long names.
- Contrast: body text ≥ 4.5:1 on background and surface; accent ≥ 3:1 on background and surface; text on accent buttons ≥ 4.5:1.
- A failing accent blocks publish and "Update live invitation" (publish checklist item `"Pick a stronger accent colour"` → step 1). Drafts still save.
- Localised text follows existing rules (`localised` = `{ en?, hi? }`; `T` / `textFor`); an override missing in one language falls back to the template's line in that language.
- Not editable: RSVP form labels/buttons, error/status messages, accessibility labels, WhatsApp reply labels, the Baba Saab credit.
- Never stage `amplify_outputs.json`. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run `npm test` from the repo root; it must stay pristine (no new warnings).

## Data shape (decided here; every task uses these names)

```js
// schema/invitation.js additions — all optional
event:  { ..., hideMap: z.boolean().optional(), hideCalendar: z.boolean().optional() }
venue:  { ..., hideMap: z.boolean().optional() }
theme:  { ..., colors: z.object({ bg: hex, accent: hex }).optional() }   // used when theme.palette === "custom"
custom: z.object({
  dateStyle: z.enum(DATE_STYLES).optional(),                         // DATE_STYLES = ["classic","ordinal","dayMonth","weekday"]
  text: z.record(z.enum(EDITABLE_TEXT_KEYS), localisedPlain).optional(),
  styles: z.object({ names, parents, intro, headings }.each(textStyle).partial()).optional(),
  countdown: z.object({ mode: z.enum(["countdown","message"]).optional(), message: localisedPlain.optional() }).optional(),
}).optional()
// hex = /^#[0-9a-fA-F]{6}$/ ; textStyle = { size?: enum ["sm","md","lg","xl"], bold?: boolean, italic?: boolean }
// localisedPlain = localised with each string max 160 chars (countdown message max 200)
```

Hiding the countdown stays in step 6 (`theme.hidden`); the new step only offers "show a message instead" and points to step 6 for hiding (spec §5.4 builder's choice — no second source of truth).

## Editor steps after this plan

1 Template & palette · 2 Couple & families · 3 Date, venue & travel · 4 Events · 5 Photos, film & music · 6 Sections · **7 Wording & style (new)** · 8 Settings · 9 Review.

## Review Focus

1. A Hindi-only invitation with an English-only wording override shows the template's Hindi line, not English or blank — test in Task 4.
2. A colour field typed halfway (`#12`) must not blank the preview or the draft: field error shown, last valid colours kept — test in Task 7.
3. Switching a Royal invitation on Custom colours to Temple must render Temple's palette and keep `theme.colors` in the draft — test in Task 7.
4. An event with `hideMap` next to one without, plus the venue switch, are independent — test in Task 1.
5. Every template rendered from its sample with no new fields produces identical HTML to before this plan — snapshot baseline in Task 1, re-run in every task.

---

### Task 1: Baseline snapshots + per-event map/calendar switches

**Files:**
- Create: `src/InvitationModule/templates/baseline.test.jsx` (+ its `__snapshots__`)
- Modify: `src/InvitationModule/schema/invitation.js` (event, venue)
- Modify: `src/InvitationModule/templates/base/BaseSections.jsx` (`Venue`, `Schedule`)
- Modify: `src/AdminModule/editor/steps/EventsStep.jsx`, `src/AdminModule/editor/steps/VenueStep.jsx`
- Test: `src/InvitationModule/templates/eventButtons.test.jsx`, `EventsStep.test.jsx`, `VenueStep.test.jsx`
- Modify: `docs/admin-guide.md` (steps 3 and 4)

**Interfaces:**
- Produces: `event.hideMap`, `event.hideCalendar`, `venue.hideMap` (booleans, absent = shown).

- [ ] **Step 1: Baseline snapshot test — commit it before any other change.** For each id in `TEMPLATE_IDS`, render `<InvitationRenderer invitation={parseInvitation({ ...getTemplate(id).sample, language })} ctx={{ skipOpening: true }} />` for `language` in `en`, `hi`, `both`, and `expect(container.innerHTML).toMatchSnapshot()`. Mock timers/date so countdown text is stable (`vi.setSystemTime(new Date("2026-01-01T00:00:00+05:30"))`). Run, commit snapshots: `test: baseline template snapshots`. Later tasks must not update these snapshots; a diff means existing invitations changed.
- [ ] **Step 2: Failing tests** in `eventButtons.test.jsx` (Minimal sample, two events, both with `mapsUrl`, venue with `mapsUrl`):
  - `hides the map link only on the event with hideMap` — event A `hideMap: true` → A's `<li>` has no "Open in Google Maps"; B's has one; venue section still has one.
  - `hides both calendar buttons only on the event with hideCalendar` — A has neither "Add to Google Calendar" nor "Download (.ics)"; B has both.
  - `venue.hideMap hides only the venue button` — venue section has no map link; events still do.
- [ ] **Step 3:** Run `npx vitest run src/InvitationModule/templates/eventButtons.test.jsx` → FAIL.
- [ ] **Step 4:** Add the three booleans to the schema; in `Venue` render the link only when `venue.mapsUrl && !venue.hideMap`; in `Schedule` render the map link when `mapsUrl && !ev.hideMap` and `<AddToCalendar>` when `!ev.hideCalendar`. (Velvet/Temple use these shared sections — confirm with grep that no template has its own copy of these buttons.)
- [ ] **Step 5:** Editor: in each event Group in `EventsStep`, two `Toggle`s — `Show "Open in Google Maps"` (`checked={!event.hideMap}`, `onChange={(on) => update(at(i,"hideMap"), on ? undefined : true)}`) and `Show calendar buttons` (description: `"Add to Google Calendar" and "Download (.ics)"`), same pattern. In `VenueStep`'s Venue group, `Toggle` `Show "Open in Google Maps"` bound to `venue.hideMap`. Tests: toggling off writes `true`, toggling on writes `undefined`.
- [ ] **Step 6:** Guide: one sentence each in steps 3 and 4.
- [ ] **Step 7:** `npm test` → all pass, baseline snapshots unchanged. Commit `feat(invite): per-event map and calendar button switches`.

### Task 2: Date style

**Files:**
- Modify: `src/InvitationModule/lib/datetime.js`, `datetime.test.js`
- Create: `src/InvitationModule/lib/customise.js` (shared readers for `inv.custom`; grows in later tasks), `customise.test.js`
- Modify: `schema/invitation.js` (add `custom.dateStyle`, `DATE_STYLES` export)
- Modify call sites of `formatDotsRange(inv.mainDate, inv.mainDateEnd)`: `templates/{floral,minimal,royal,velvet}/index.jsx`, `templates/base/BaseSections.jsx` (cover, save-the-date big date, `WhatsAppShare` message), `templates/temple/index.jsx` (its `formatDots` uses that show the date as text — not the scratch cards)
- Modify: `og/cardModel.js`, `lib/ogText.js`
- Modify: `src/AdminModule/editor/steps/VenueStep.jsx` (+ test)
- Test: `src/InvitationModule/templates/dateRange.test.jsx` (extend)

**Interfaces:**
- Produces: `export const DATE_STYLES = ["classic","ordinal","dayMonth","weekday"]` (schema/invitation.js); `formatShortDate(start, end, style = "classic", lang = "en") → string` (datetime.js); `shortDate(inv, lang) → string` and `cardDate(inv, lang) → string` (customise.js).

- [ ] **Step 1: Failing tests for `formatShortDate`** (exact strings):
  - classic: `("2026-12-11", undefined)` → `"11 · 12 · 2026"`; `("2026-12-11","2026-12-12")` → `"11–12 · 12 · 2026"` (= `formatDotsRange`).
  - ordinal en: one day `"11th Dec 2026"`; range `"11th & 12th Dec 2026"`; `("2026-11-30","2026-12-01")` → `"30th Nov & 1st Dec 2026"`; `("2026-12-31","2027-01-01")` → `"31st Dec 2026 & 1st Jan 2027"`; suffixes: 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 31st.
  - dayMonth en: `"11 December 2026"`; `"11 & 12 December 2026"`; `"30 November & 1 December 2026"`.
  - weekday en: one day `"Friday, 11 December 2026"`; range = `formatDateRange` (`"Friday 11 – Saturday 12 December 2026"`).
  - hi: ordinal and dayMonth both → `"11 और 12 दिसंबर 2026"` (one day `"11 दिसंबर 2026"`); weekday hi one day = `formatDate(..., "hi")`.
  - invalid end (same day / 8 days later) → single-day form for every style; unknown style → classic; bad start → `""`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement with the existing `validEndDate`, `pieces`/`Intl` month names (long for dayMonth, short for ordinal en), `DASH`. `lang === "both"` → English.
- [ ] **Step 4:** `customise.js`: `shortDate(inv, lang) = formatShortDate(inv.mainDate, inv.mainDateEnd, inv.custom?.dateStyle, lang === "hi" ? "hi" : "en")`; `cardDate(inv, lang)` = `formatDateRange(...)` when style is absent/classic (today's card), else `shortDate`. Tests for both.
- [ ] **Step 5:** Replace every short-date call site with `shortDate(inv, lang)`; `cardModel` and `ogDescription` use `cardDate`. Temple's three scratch cards keep `dateRangeParts`.
- [ ] **Step 6:** Extend `dateRange.test.jsx`: per template (all five), `custom: { dateStyle: "ordinal" }` with `11–12 Dec` shows `"11th & 12th Dec 2026"`; no dateStyle → baseline unchanged.
- [ ] **Step 7:** VenueStep: `ChipGroup legend="How the date is written"`, options = the four styles labelled with the invitation's current dates rendered by `formatShortDate` (fallback example dates `2026-12-11`/`2026-12-12` when no date), value `content.custom?.dateStyle ?? "classic"`, onChange writes `undefined` for classic. Test.
- [ ] **Step 8:** Guide (step 3). `npm test` (baseline unchanged). Commit `feat(invite): date style choice`.

### Task 3: New "Wording & style" step scaffold + renumbering

**Files:**
- Create: `src/AdminModule/editor/steps/WordingStep.jsx` (+ `WordingStep.test.jsx`) — empty groups filled by Tasks 4–6
- Modify: `steps/index.js` (`STEPS`, `stepHasContent`), `stepNumber.js` (`STEP_COUNT = 9`), `lib/checklist.js` (`STEP_FOR_FIELD`: `custom: 7`, `rsvp: 8`, `showCredit: 8`, default `9`; `theme.colors` → 1), every test/doc that hard-codes steps 7/8 (`grep -rn "step 7\|step 8\|step: 7\|step: 8\|step=7\|step=8" src docs/admin-guide.md`)
- Modify: `docs/admin-guide.md` (rename headings to `Editor step 8: Settings`, `Editor step 9: Review`; add `## Editor step 7: Wording & style`; fix in-text references)

**Interfaces:**
- Produces: `WordingStep({ content, update, errors, language, templates })`; step 7 `stepHasContent` = `Boolean(content.custom && Object.keys(content.custom).some(k => k !== "dateStyle"))`.

- [ ] **Step 1:** Failing tests: `STEPS[6].title === "Wording & style"`, `STEPS.length === 9`, `stepNumber("9") === 9`, `stepForPath(["rsvp"]) === 8`, `stepForPath(["custom","text"]) === 7`, `stepForPath(["theme","colors","accent"]) === 1`, guide anchors for all 9 steps exist in `docs/admin-guide.md` (existing guideHref test pattern).
- [ ] **Step 2:** Implement; fix every existing test that assumed 8 steps. `npm test`. Commit `feat(editor): Wording & style step`.

### Task 4: Wording overrides

**Files:**
- Modify: `lib/ui-strings.js` (export `EDITABLE_TEXT_KEYS`), `lib/customise.js` (`uiText`), `schema/invitation.js` (`custom.text`)
- Modify: `templates/registry.js` (each template gets `textKeys: [...]` — the editable keys it actually renders)
- Modify: every editable `UI.<key>` use in `templates/**` and `sections/Countdown.jsx` (`begun` — pass the resolved text in as a prop from `CountdownSection`)
- Modify: `AdminModule/invitations/templateChoices.js` (pass `textKeys`), `AdminModule/editor/test-utils.jsx`, `WordingStep.jsx`
- Test: `customise.test.js`, `templates/wording.test.jsx`, `WordingStep.test.jsx`

**Interfaces:**
- Produces: `EDITABLE_TEXT_KEYS = ["weddingOf","together","saveTheDate","countdown","begun","venue","travel","schedule","gallery","film","rsvp","sendRsvp","rsvpBy","closing","blessing","foreverUs","warmRegards","scrollCue","tapToOpen","scrollToOpen","scratchHint"]`; `uiText(inv) → typeof UI` with each editable key replaced by `{ en: override.en || UI[key].en, hi: override.hi || UI[key].hi }`.

- [ ] **Step 1: Failing unit tests** — `uiText` with no `custom` returns values equal to `UI`; override `{ together: { en: "You are cordially invited to the wedding of" } }` → `uiText(inv).together.en` is that, `.hi` is `UI.together.hi` (Review Focus 1); non-editable keys (`submit`, `credit`) are never overridden even if present in data (schema rejects them; uiText ignores them).
- [ ] **Step 2:** Implement; schema `text: z.record(z.enum(EDITABLE_TEXT_KEYS), localisedPlain)`.
- [ ] **Step 3: Failing render test** `wording.test.jsx`: for each template and **each key in its `textKeys`**, set an override `"ZZ <key>"` (en) and assert the rendered text (with `skipOpening: false` where the key is in the opening, e.g. `tapToOpen`) contains it; a Hindi-language invitation with only an English override shows `UI[key].hi`. This test is what keeps `textKeys` honest.
- [ ] **Step 4:** In each component that renders an editable key, `const ui = uiText(inv)` and use `ui.<key>` (components already receive `inv`). Fill `textKeys` per template from what the test proves.
- [ ] **Step 5:** WordingStep group "Wording": for the current template's `textKeys`, a `LocalisedInput` per key, label = a staff-facing name (e.g. `together` → "Line above the couple's names"), `hint` = template default (`UI[key].en` / hi), grouped "Opening", "Cover & couple", "Section headings", "Closing"; writing empty clears the key (`undefined`). "Reset wording" button clears `custom.text`. Tests: typing writes `custom.text.together.en`; only the template's keys shown (Minimal shows no `blessing`); reset clears.
- [ ] **Step 6:** Guide. `npm test` (baseline unchanged). Commit `feat(invite): rewrite preset wording`.

### Task 5: Countdown message

**Files:**
- Modify: `schema/invitation.js` (`custom.countdown`), `templates/base/BaseSections.jsx` (`CountdownSection`), `base.module.scss` (`.countdownMessage`), any template SCSS that styles the countdown area (check temple/velvet), `WordingStep.jsx`
- Test: `templates/countdownMessage.test.jsx`, `WordingStep.test.jsx`

**Interfaces:**
- Consumes: `uiText` (Task 4).

- [ ] **Step 1: Failing tests** (all five templates): `custom.countdown = { mode: "message", message: { en: "See you in Jaipur!" } }` → countdown section shows the message, no "Days"/"Hours" units, and no heading unless `custom.text.countdown` is set (then that heading shows); `mode: "message"` with empty message → normal countdown; hidden via `theme.hidden: ["countdown"]` → nothing, whatever the mode.
- [ ] **Step 2:** Implement (`<T as="p" v={message} className={s.countdownMessage} />`, styled like the countdown numbers' font/colour, wraps).
- [ ] **Step 3:** WordingStep group "Countdown": `ChipGroup` Countdown / Message; when Message, `LocalisedInput` (max 200); note `To hide the countdown completely, switch it off in step 6 (Sections).` with a link to step 6. Tests.
- [ ] **Step 4:** Guide. `npm test`. Commit `feat(invite): message instead of countdown`.

### Task 6: Text size, bold and italic

**Files:**
- Modify: `schema/invitation.js` (`custom.styles`), `lib/customise.js` (`textStyleVars`), `InvitationRenderer.jsx` (merge vars into the wrapper style)
- Modify SCSS for every element in the four groups, in `templates/base/base.module.scss` and each template's `*.module.scss` (and inline-styled spots in temple/velvet if any)
- Modify: `WordingStep.jsx`
- Test: `customise.test.js`, `templates/textStyles.test.jsx`, `WordingStep.test.jsx`

**Interfaces:**
- Produces: `TEXT_STYLE_ELEMENTS = ["names","parents","intro","headings"]`; `SIZE_SCALE = { sm: 0.85, md: 1, lg: 1.2, xl: 1.4 }`; `textStyleVars(inv) → object` of CSS custom properties, **only for set values**: `--names-scale`, `--names-weight` (`700` when bold), `--names-style` (`italic`), same for `parents`, `intro`, `headings`. Absent styles → `{}` (keeps baseline snapshots identical).

- [ ] **Step 1: Failing unit tests** for `textStyleVars`: `{}` for none; `{ names: { size: "xl", bold: true } }` → `{ "--names-scale": "1.4", "--names-weight": "700" }`; `md`/`false` produce nothing.
- [ ] **Step 2:** Implement and merge into `InvitationRenderer`'s style after `themeStyle`.
- [ ] **Step 3:** SCSS: each element's `font-size: X` becomes `font-size: calc(X * var(--names-scale, 1))` (for `clamp(a, b, c)` scale all three parts), `font-weight: var(--names-weight, <design weight>)`, `font-style: var(--names-style, <design style>)`, plus `overflow-wrap: anywhere` on names/parents. Element groups: **names** = cover names, opening names, couple-section person names, closing names (every template); **parents** = parents lines; **intro** = the line above the couple (`together`/`weddingOf` eyebrow, Temple's `blessing`); **headings** = section titles (`.sectionTitle` and template equivalents). Grep each template's JSX for the classes rendering these.
- [ ] **Step 4: Render test** (all five): with `names: { size: "xl", bold: true, italic: true }` the wrapper `style` carries the three vars; an element with the names class exists (guards the class mapping). jsdom can't compute CSS, so also add a static test that reads each template's SCSS source and asserts it references `--names-scale`, `--parents-scale`, `--intro-scale`, `--headings-scale` (keeps a template from being skipped).
- [ ] **Step 5:** WordingStep group "Text size & style": for each element (labels "Couple's names", "Parents' names", "Opening line", "Section headings") a size `ChipGroup` (Smaller / Normal / Larger / Largest) and `Toggle`s Bold, Italic; Normal/off write `undefined`. "Reset styles". Tests.
- [ ] **Step 6: Manual phone check** (required by spec): dev server on a free port (port 3000 may be held by processes we didn't start — never kill them), open `/admin` editor preview or a draft preview at 360×740, all five templates, names "Venkatalakshmi Subramanian" & "Raghunandan Krishnamurthy", parents line 80 chars, every element at Largest + bold + italic, language `both`: no horizontal scroll, no overlap, envelope/cover still usable. Record what you checked in the report. Stop your server.
- [ ] **Step 7:** Guide. `npm test` (baseline unchanged). Commit `feat(invite): text size, bold and italic`.

### Task 7: Custom colours (Royal, Floral, Minimal)

**Files:**
- Create: `src/InvitationModule/lib/colors.js`, `colors.test.js`
- Modify: `schema/invitation.js` (`theme.colors`), `templates/registry.js` (`customColours: true` on royal/floral/minimal; `paletteVars(template, invitation)`; `themeStyle(template, invitation)`), callers: `InvitationRenderer.jsx`, `og/cardModel.js`, `app/(invite)/preview/template/[templateId]/page.js` (unchanged behaviour), `lib/preview.js` (pass `theme.colors` through)
- Modify: `lib/checklist.js` (+ test), `AdminModule/invitations/templateChoices.js`, `editor/test-utils.jsx`, `editor/steps/TemplateStep.jsx` (+ test)
- Test: `templates/customColours.test.jsx`

**Interfaces:**
- Produces (colors.js): `isHex(s) → boolean`; `contrastRatio(hexA, hexB) → number` (WCAG relative luminance); `customPaletteVars({ bg, accent }) → { "--bg","--surface","--text","--muted","--primary","--accent","--on-primary","--error" }`; `accentPasses({ bg, accent }) → boolean` (accent ≥ 3 vs `--bg` and `--surface`); `suggestAccent({ bg, accent }) → hex` (same hue/saturation, lightness stepped away from bg until `accentPasses`).
- Produces (registry.js): `paletteVars(template, invitation) → vars` — derived vars when `invitation.theme.palette === "custom" && template.customColours && isHex(bg) && isHex(accent)`, else `getPalette(template, palette).vars`.

- [ ] **Step 1: Failing colour tests** — for backgrounds `#ffffff`, `#000000`, `#7b1e3a` (festive maroon), `#808080`, `#fff8e7`, `#0b1d3a` and accents `#d4af37`, `#ffffff`, `#000000`, `#c0392b`: `--text` and `--muted` ≥ 4.5 vs `--bg` and `--surface`; `--on-primary` ≥ 4.5 vs `--primary`; `accentPasses({bg:"#fff8e7",accent:"#f3e5ab"}) === false`; `suggestAccent` result passes and stays within 15° hue of the input; `contrastRatio("#000000","#ffffff") ≈ 21`.
- [ ] **Step 2:** Implement (`--primary` and `--accent` = accent; `--text` = `#1d1d1f` or `#f7f3ea`, whichever contrasts more with bg; `--surface` = bg mixed 6% toward white on a light bg, or 6% toward `--text` on a dark bg (text must stay ≥ 4.5 on it); `--muted` = mix of text→bg stepped back until ≥ 4.5; `--on-primary` = `#ffffff` or `#1d1d1f`, whichever contrasts more; `--error` `#b42318` on light bg, `#ff8a80` on dark).
- [ ] **Step 3:** Schema `theme.colors: { bg: hex, accent: hex }` optional; registry `paletteVars`/`themeStyle` change; callers updated; `preview.js` theme passes `colors: d.theme?.colors`.
- [ ] **Step 4: Failing render tests:** Royal/Floral/Minimal with `theme: { palette: "custom", colors: { bg: "#7b1e3a", accent: "#d4af37" } }` → wrapper style `--bg: #7b1e3a`; same data on Temple/Velvet → that template's first palette (Review Focus 3, render side); no `custom` palette → baseline unchanged; `cardModel` colours follow the custom bg/accent.
- [ ] **Step 5: Checklist:** when `theme.palette === "custom"` on a template with custom colours: missing/invalid colours → `{ id: "colors", message: "Choose the custom background and accent colours", step: 1 }`; `!accentPasses` → `{ id: "accent", message: "Pick a stronger accent colour", step: 1 }`. On Temple/Velvet `"custom"` never appears (TemplateStep resets the palette). Tests.
- [ ] **Step 6: Editor (TemplateStep):** when the current template has `customColours`, the palette ChipGroup gets a **Custom** option (swatch from `theme.colors` or a neutral gradient). Choosing it sets `theme.palette = "custom"` and, if `theme.colors` is empty, seeds it from the current palette's `bg`/`primary`. Two colour fields (Background, Accent): text input (hex) + `<input type="color">`, kept in sync; while the typed value isn't a valid hex, show `Use a colour code like #7B1E3A` and **don't write** it (draft and preview keep the last valid — Review Focus 2). If `!accentPasses`: warning `This accent is hard to read on this background. Invitations can't go live until it's fixed.` + button **Use suggested colour** (writes `suggestAccent`). `chooseTemplate` already resets the palette when the new template lacks it — `"custom"` is not in Temple/Velvet palettes so it resets, and `theme.colors` stays (Review Focus 3, editor side: test that switching royal-custom → temple keeps `theme.colors` and sets temple's first palette; switching back and choosing Custom shows the saved colours).
- [ ] **Step 7:** Guide (step 1). `npm test` (baseline unchanged). Commit `feat(invite): custom colours for Royal, Floral and Minimal`.

### Task 8: Final pass

- [ ] `npm test` pristine; `npx tsc -p amplify` OK; `npx next build` in a scratch copy or on a free port (Windows `next/og` font-URL issue is known and not ours).
- [ ] Dev server on a free port: `/preview/template/<id>` for all five → 200; one draft with every option set renders in the editor preview at 360px. Stop the server.
- [ ] `docs/admin-guide.md` read-through: steps 1, 3, 4, 7 (new), 8, 9; "Editor step 7: Settings" references elsewhere updated to step 8.
