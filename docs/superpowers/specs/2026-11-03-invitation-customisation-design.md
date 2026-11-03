# Invitation customisation — wording, date style, text size/style, countdown message, custom colours

Builds on: parent spec `2026-10-06-digital-invitations-design.md`, the editor (Phase 2a), two-day dates (merged 2026-10-30).

## 1. Why

Customers like a design but ask for small personal changes, and today staff have to say "that's fixed in the design". Real requests (Modern Minimal):

1. Date written as "9th & 10th Dec 2026" instead of `09–10 · 12 · 2026`.
2. "Together with their families" replaced by "You are cordially invited to the wedding of".
3. Festive colours — dark or their own colour codes.
4. Hide the countdown, or show their own message in its place.
5. Bigger parents' names, or bigger bride/groom names.

**Success:** staff make all of these in the editor, in minutes, without a developer, and the invitation still looks finished on a phone.

## 2. Decisions (owner, 2026-11-03)

| # | Decision |
|---|---|
| D1 | Everything below ships for **all five templates**, except custom colours. |
| D2 | **Custom colours only for Royal Rajasthani, Floral Pastel and Modern Minimal.** Temple Classic and Velvet Envelope keep their current palettes for now (custom colours there may come later). |
| D3 | Custom colours = staff type a colour code or use a picker. |
| D4 | Text sizes for the couple's names and parents' names (and other key text) must be adjustable. |
| D5 | Mobile must look good with no breakage. |

## 3. Goals, non-goals, anti-goals

**Goals:** rewrite preset wording; choose a date style; adjust size/bold/italic of key text; replace or hide the countdown; custom background + accent colours on three templates; all visible in the editor's live preview.

**Non-goals:** custom colours for Temple/Velvet; new palettes for Temple/Velvet; free choice of fonts; pixel-exact sizes; moving or adding page elements; editing RSVP form labels, error messages or accessibility labels; per-guest wording.

**Anti-goals (failure even if it "works"):** text that is hard to read on the chosen colours; a layout that overflows or breaks at 360px width; any existing invitation that looks different without someone changing it; a date shown that disagrees with the real date or countdown; staff able to make an invitation look broken with a few clicks.

## 4. What exists (read before planning)

- Fixed guest-visible text: `src/InvitationModule/lib/ui-strings.js` (`UI`, en + hi), used by all templates via `textFor`.
- Dates: `lib/datetime.js` — `formatDots`/`formatDotsRange` (short), `formatDate`/`formatDateRange` (long), `dateRangeParts` (Temple's three scratch cards). Used by templates, `BaseSections.jsx`, `og/cardModel.js`, `lib/ogText.js`.
- Colours: each template's `palettes.js` sets CSS variables. Royal/Floral/Minimal use only `--bg --surface --text --muted --primary --accent --on-primary (--error)`. Temple and Velvet have many extra variables and ~150 colours hard-coded in their styles (hence D2).
- Countdown: its own section (`countdown`), already hideable in editor step 6 (`theme.hidden`).
- Editor steps: `src/AdminModule/editor/steps/index.js`; guide anchors depend on step numbers/titles (`guideHref`, `docs/admin-guide.md`).
- Invitation shape: `schema/invitation.js` (zod); drafts cleaned by `schema/draft.js`; live copy updated only on "Update live invitation".

## 5. Features

### 5.1 Preset wording

- Staff can override the guest-visible preset lines, per invitation. An empty field keeps the template's wording. Each override follows the invitation's language like other text (English, Hindi, or both).
- **Editable (my call):** the lines that read as part of the invitation — e.g. "The wedding of", "Together with their families", "Save the Date", the countdown heading, "The celebrations have begun!", section headings (Venue, Getting there, Celebrations, Our moments, The invitation film, RSVP), "Kindly respond by", "With best compliments from", Temple's blessing line, "Forever us", "Warm regards", and opening prompts ("Tap to open", "Scroll to open", "Scratch to reveal the date"). The builder decides the exact list from `UI`, using this rule: decorative/heading text yes; form labels, buttons inside the RSVP form, error/status messages, accessibility labels, the WhatsApp reply labels and the Baba Saab credit no.
- The editor shows each editable line with the template's default as a placeholder, grouped by where it appears, and only lines the current template actually uses (my call — a line Temple never shows is not offered for Minimal).
- Overrides are plain text (no formatting codes), with a sensible length limit per line.

### 5.2 Date style

- One setting per invitation; default = today's look (no change for existing invitations).
- Choices (my call), each handling two-day dates (§ two-day rules in `datetime.js`: end date valid only 1–7 days after):
  | Style | One day | Two days |
  |---|---|---|
  | Classic (default) | `11 · 12 · 2026` | `11–12 · 12 · 2026` |
  | Ordinal | `11th Dec 2026` | `11th & 12th Dec 2026` |
  | Day & month | `11 December 2026` | `11 & 12 December 2026` |
  | With weekday | `Friday, 11 December 2026` | `Friday 11 – Saturday 12 December 2026` |
  Month/year changes inside a range are written on both sides as `formatDateRange` already does. Hindi uses the same patterns with Hindi month/weekday names and no English ordinals ("11 और 12 दिसंबर 2026").
- Applies where the short date appears (covers, save-the-date big date, share message). The long sentence under the save-the-date stays the long format. Temple's three scratch cards keep Month/Date/Year (my call). The WhatsApp card/description use the chosen style.

### 5.3 Text size and style

- Adjustable elements (D4): **couple's names**, **parents' names**, **opening line** (the "Together with…"/blessing line), **section headings**. Builder may add the countdown message (§5.4) to the same controls.
- Each element: size **Smaller / Normal / Larger / Largest** (relative to the design's own size, e.g. ×0.85 / ×1 / ×1.2 / ×1.4 — exact factors builder's call), **Bold**, **Italic**. Default = Normal, design's own weight/style.
- The same element settings apply in all templates; each template maps them onto its own elements (cover names and couple-section names both count as "couple's names").
- D5: at 360px wide with long names (e.g. "Venkatalakshmi Subramanian") and Largest, nothing overflows or overlaps; text wraps. Script fonts that become unreadable in bold/italic are acceptable as "what staff chose", but must not break layout.

### 5.4 Countdown or message

- Setting with three choices: **Countdown** (default), **Message**, **Hidden**. "Message" shows a short staff-written line (localised) in the countdown's place, styled like the countdown area. "Hidden" is the same as hiding the countdown section in step 6 — the two controls must stay in agreement (builder decides whether this setting simply drives `theme.hidden` or lives only in step 6 with the message beside it).

### 5.5 Custom colours (Royal, Floral, Minimal only — D2)

- Step 1 offers **Custom** next to the ready-made palettes for these three templates. Staff set **Background** and **Accent**: hex code field + colour picker, kept in sync.
- All other colours are derived: text = dark or light, whichever reads better on the background; muted text, surface and on-accent derived to keep contrast. Contrast rule: body text ≥ 4.5:1 on background and surface (matches existing palette tests).
- If the accent is too weak for headings/buttons on that background, the editor shows a warning and a **Use suggested colour** button with the nearest colour that passes (same hue, darker or lighter). **Blocking (owner, 2026-11-03):** a failing accent is a publish-checklist item ("Pick a stronger accent colour" → step 1), so the invitation can't be published or updated live until it passes. Threshold (my call): accent ≥ 3:1 against background and surface (WCAG large-text/UI level — accent is used for headings, borders and buttons); text on accent buttons ≥ 4.5:1 (derived automatically). The draft may still be saved with a failing accent.
- The live preview updates as they type; an invalid code shows a field error and the preview keeps the last valid colours.
- The WhatsApp/OG card uses the custom colours.
- Switching to Temple or Velvet: the colour fields disappear and that template's palette is used; the custom colours stay saved and come back if the template is switched back (my call).

## 6. Data

New optional fields on the invitation (exact shape builder's call), all absent on existing invitations = today's behaviour:
- wording overrides (per key, localised);
- date style;
- per-element size/bold/italic;
- countdown mode + message (localised);
- custom colours (background, accent) and whether the custom palette is chosen.
Validated in `schema/invitation.js` and cleaned in `schema/draft.js` like other fields; colours must be valid 6-digit hex; unknown keys dropped. The public page and preview read them from the live/draft copy as today.

## 7. Editor

- Colours: step 1 (with the palettes).
- Date style: step 3, next to the dates, with a live example of the current dates in each style.
- Wording, text size/style and countdown/message: a new step **"Wording & style"** (my call: placed after step 6 "Sections"; Settings and Review move to 8 and 9). Guide headings/anchors, `stepHasContent` and tests updated accordingly.
- Each group has **Reset to design** (my call).

## 8. Errors and edge cases

- Hindi/both invitations: override fields appear per language as other localised fields do; an override given only in English falls back to the template's Hindi line for Hindi (same rule as other localised text).
- Very long overrides: limited length; wrap on phones.
- Template switch: wording overrides that the new template doesn't show are kept but unused.
- Live invitations: changes reach guests only after "Update live invitation" (as today).

## 9. Testing

Unit: each date style (one day, two days, month/year crossing, Hindi); colour derivation and contrast (incl. very dark, very light, mid-grey backgrounds, failing accent → suggestion passes); wording override fallback; schema/draft cleaning (bad hex, unknown keys, absent = unchanged). Render: every template with no customisation renders exactly as before; overrides, date style, sizes, bold/italic, countdown message/hidden show in each template; custom colours apply in Royal/Floral/Minimal and are ignored in Temple/Velvet. Editor: new controls update the draft and preview. Manual: 360px phone with long names at Largest in all five templates.

## 10. Staff guide

`docs/admin-guide.md`: custom colours (and the warning), date styles, the new "Wording & style" step, renumbered steps.

## 11. Answers to the builder check

- No AWS Lambda formats dates or colours (checked `amplify/`); the OG card, `ogText.js` and the share message all run in the Next app and import `datetime.js` / the registry palettes directly — one change, no deploy ordering.
- OG image caching: unchanged from today (my call). WhatsApp keeps its own preview of a link regardless; no cache-busting work in scope.
- Countdown "Message" mode shows regardless of dates (the countdown section is always shown today — `sections.js` `countdown: () => true`).

## Left to the builder

Exact data shape and key names; the exact editable-text list within §5.1's rule; size factors; colour-derivation maths (within the contrast rule); editor layout in the existing admin style; how the countdown setting and step 6 hide stay in agreement; splitting the work into parts (suggested order: date style → wording → countdown/message → text size/style → custom colours).
