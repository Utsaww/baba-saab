# RSVP list — saved replies, staff RSVP page, private family page

Builds on: parent spec `2026-10-06-digital-invitations-design.md`, Phase 3 (`2026-10-13-…-public-design.md`), Phase 5 (`2026-10-15-…-lifecycle-design.md`), and the WhatsApp RSVP work merged 2026-10-17 (guests' replies open WhatsApp to the family's number; nothing stored). This document replaces the parked "Phase 4a" RSVP storage idea.

## 1. Why

Today each RSVP is only a WhatsApp message in the family's chat. Nobody — not Baba Saab staff, not the family — has a combined list or headcounts, and a guest who replies twice is counted twice. The owner wants a proper list for staff **and** for the family.

**Success:** a few days before the wedding, the bride's mother opens a private link and instantly sees how many are coming in total and per event, searches a guest, and downloads the list; staff see the same in admin and can fix replies that came by phone.

## 2. Decisions (owner, 2026-10-24)

| # | Decision |
|---|---|
| D1 | Build saving + staff page (**A**) and the private family page (**B**) together. |
| D2 | Family page shows totals, per-event headcounts, the guest list (newest first) with search, event filter and Download. |
| D3 | Family page **shows guests' phone numbers**. |
| D4 | Family page is **read-only**; edits go through staff. Staff can make a new family link (old one stops working). |
| D5 | The guest still gets WhatsApp opened to the family after their reply is saved (existing behaviour kept). |
| D6 | A second reply from the **same phone with a different name** is kept as a **separate guest**, marked with a red "!" icon whose tooltip says it's the same family as the other name(s). Same phone + same name updates the earlier reply. |

## 3. Goals, non-goals, anti-goals

**Goals:** save every live RSVP; one reply per phone per invitation (a second reply from the same phone updates the first); staff RSVP page with table, totals, per-event headcounts, CSV, add/edit/remove; "new replies" badge on the invitations list; private family page; erase RSVPs with their invitation.

**Non-goals:** personal guest links / guest list import (`?g=` — still parked), view counts, email/SMS notifications, guests editing via a link, family editing.

**Anti-goals (failure even if it "works"):** a reply lost because the save failed silently; guests blocked from replying because our server is slow (WhatsApp must still open); RSVPs or phone numbers reachable without the secret link or a staff login; test replies from previews mixing with real ones; RSVPs surviving after their invitation is erased.

## 4. What exists and stays

- The guest form (`RsvpForm`, shared by all five templates) and its opt-in: shown only when `rsvp.enabled && rsvp.channel === "whatsapp"` and the family number is a valid WhatsApp number; deadline closes it; preview pages show a preview note; the guest's last answers are prefilled on their device (`rsvp:<slug>`).
- Fields: name, phone, attending (yes/no/maybe), guest count (if asked), events (listed ones), meal (if asked), message, honeypot.

## 5. Guest flow (changed)

On **Send** on a **live** page:
1. The form validates (as today) and posts the reply to our server (Next route `POST /api/rsvp` with the invitation slug).
2. The server checks: invitation is published and its live copy has RSVP on (opt-in rules above); not past the deadline (IST, whole deadline day); honeypot empty; valid fields; rate limit (5 submissions/hour per phone and per scrambled network address). Then it **saves** the reply.
3. The form then opens WhatsApp exactly as today (D5) and shows a short confirmation: "Your reply is saved. Send it on WhatsApp to let the family know personally."
4. If saving fails (network/server error or rate limit): the form still opens WhatsApp and shows "We couldn't save your reply — your WhatsApp message still reaches the family." (anti-goal: never block the guest). If the server says RSVPs are **closed**, show the closed notice and do not open WhatsApp. Invalid fields are caught by the form before sending (my call).
5. **Same phone and same name again** (phone normalised the same way as the WhatsApp number check; name compared ignoring case and extra spaces) → replaces that guest's earlier reply; staff/family see "updated".
6. **Same phone, different name** (D6) → saved as a **separate guest**. In the staff and family lists such rows show a small **red "!" icon** whose tooltip reads "Same family as <other name(s)> — replied from the same phone number".

**Previews** (customer preview link, editor preview, template preview) never save anything — behaviour as today.

## 6. Data

New table **Rsvp** (one row per invitation + normalised phone + normalised name):
`invitationId, phoneKey (normalised digits), nameKey (lower-cased, single-spaced name), name, phone (as typed), attending, guestCount?, eventIds[], meal?, message?, source: "guest" | "staff", createdAt, updatedAt`.
- Identifier: `invitationId` + `phoneKey` + `nameKey` (same phone and name overwrites; same phone with a different name is a new row — D6). The "same family" marker is derived when listing (rows sharing `phoneKey`). Staff-added replies without a phone use a generated key and never get the marker.
- Rate-limit counters: a small table or the same table with TTL items, keyed by phone and by scrambled network address per hour (builder's choice; must expire automatically).
- `Invitation` gains: `familyToken` (secret, 128-bit, like `previewToken`), `rsvpCount` and `rsvpSeenAt` / `rsvpNewCount` (builder's choice of how "new since staff last looked" is computed — see §8).
- **Erase:** the Phase 5 erase routine also deletes all Rsvp rows of the invitation (before the invitation row), idempotently.

## 7. Backend

- **Guest submit:** a public operation callable without login (same guest-access pattern as the public invitation lookup), implemented as a small function that can **only** read the invitation and write that invitation's RSVPs and rate-limit counters. All checks of §5 run there, not only in the website.
- **Family page data:** a public operation taking `slug` + `familyToken`; returns totals, per-event headcounts and the replies **only** when the token matches; otherwise nothing. Read-only.
- **Staff operations** (staff login only): list replies for an invitation, add/edit/remove a reply, make a new family link, mark replies as seen.
- Least privilege: guest-callable functions get no access beyond what each needs; nothing about RSVPs is readable by the guest role except through the family operation with the right token.

## 8. Staff screens

- **Invitations list:** a "**N new**" badge on invitations with replies since staff last opened that invitation's RSVP page (shared across staff — my call), and the total reply count.
- **New page** `/admin/invitations/[id]/rsvps` (linked from the editor and the list):
  - totals (coming / not coming / maybe, total people = sum of guest counts of "coming"), per-event headcounts (people coming per event; replies with no events selected count for all events — my call, mirrors "invited to all");
  - table, newest first: name, phone, attending, people, events, meal, message, replied/updated time, source (guest/staff);
  - search by name/phone, filter by event and by attending;
  - **Add reply** / **Edit** / **Remove** (confirm), works even after the deadline;
  - **Download CSV** (UTF-8 with BOM so Excel shows Hindi correctly; columns as the table);
  - **Family link** panel: the link with Copy / Send on WhatsApp / **New family link** (confirm: "The old family link will stop working.").
- Opening this page marks replies as seen.

## 9. Family page

- Route: `/rsvps/<slug>?k=<familyToken>` (builder may choose the exact path; must not collide with `/invitation/[slug]`, must be `noindex`, no site header/footer, light design matching admin).
- Shows the couple's names, totals, per-event headcounts, the guest list (newest first) with phone numbers (D3), search, event filter, **Download** (same CSV) — read-only (D4).
- Wrong/old token, unknown slug, or erased invitation → calm "This link is no longer available" (404).
- Works for draft, live and offline invitations; not for deleted ones.
- Rendered per request (always current); never cached publicly.

## 10. Errors and edge cases

- Deadline passed → guest form already shows "RSVPs closed…"; the server also refuses.
- RSVP turned off by staff after replies exist → replies stay visible to staff and family.
- Invitation erased → its replies are erased with it (Phase 5).
- Rate-limited → friendly message; WhatsApp still opens (§5).
- Two staff editing one reply → last save wins (low stakes) — my call.
- Phone typed differently ("+91 98765 43210" vs "9876543210") → same phone (shared normaliser); with the same name it's the same guest.
- A guest who changes the spelling of their own name on a second reply becomes a second row with the "same family" marker; staff can remove the duplicate.

## 11. Testing

Unit: phone key normalisation, dedupe/overwrite, deadline in IST, rate-limit windows, totals/headcount maths (incl. "no events = all events", maybe/no excluded from people), CSV (BOM, escaping, Hindi). Backend: guest submit checks and refusals, family token check, staff-only operations, erase deletes RSVPs. Components: form save + WhatsApp + fallback messages, staff page (table, filters, add/edit/remove, family link), family page (totals, list, search, filter, not-available). Manual on a preview branch: real phone reply → appears in admin and family page; same phone updates; new family link kills the old one; guest probe can't read RSVPs without the token.

## 12. Staff guide

`docs/admin-guide.md`: RSVPs page, family link (and that it shows phone numbers — share only with the family), CSV, adding replies taken by phone.

## 13. Calls made after the builder check (mine — owner may overrule)

- **Rate limits:** 5 submissions/hour per phone; per scrambled network address (IP hashed with a server-side secret) **60/hour**, because many guests at one venue or on one mobile carrier can share an address.
- **Save failure:** the form retries the save once automatically; if it still fails it shows the warning and opens WhatsApp (§5.4). No offline queue.
- **Phone is required** on the guest form (as today).
- **Guest resubmits after a staff edit:** the guest's reply replaces it and `source` becomes "guest"; staff see it as updated.
- **Existing invitations:** nothing to backfill (no replies were stored before). `familyToken` is created the first time staff open the RSVP page (like `previewToken`).
- **What the guest function enforces** is read from the **published live copy** only (RSVP on, deadline); draft edits never change it until "Update live invitation".
- **Family page privacy:** `Referrer-Policy: no-referrer`, `Cache-Control: no-store`; the Download file is built in the browser from the page's data (no second public operation).
- **Erase:** RSVP rows are deleted in pages; a partial failure is retried by the next nightly run (idempotent), and the invitation row is only deleted after all its RSVPs are gone.

## Left to the builder

Exact table/key design within §6, route names, how "new" is tracked, rate-limit storage, UI layout details in the existing admin style.
