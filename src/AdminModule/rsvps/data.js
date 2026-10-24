import { randomUUID } from "node:crypto";
import { cookieDataClient } from "@/AdminModule/dataClient";
import { parseAwsJson } from "@/AdminModule/invitations/content";
import { rsvpKeyFor } from "@/InvitationModule/lib/rsvpList";

function failIfErrors(errors) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
}

/** Every reply for one invitation, all pages. */
export async function listRsvps(invitationId) {
  const rows = [];
  let nextToken = null;
  do {
    const page = await cookieDataClient().models.Rsvp.list({ invitationId, limit: 100, nextToken });
    failIfErrors(page.errors);
    rows.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return rows;
}

export const KEY_TAKEN = "Another reply already uses this name and phone — edit that one instead.";

/** Thrown when an edit would land on another guest's row; its message is safe to show staff. */
export class RsvpConflict extends Error {
  constructor() {
    super(KEY_TAKEN);
    this.name = "RsvpConflict";
  }
}

/**
 * Save one reply entered or edited by staff (source becomes "staff"). The key always follows the phone and name:
 * phone -> rsvpKeyFor, no phone -> an existing staff#… key or a fresh one. When an edit changes the key, the row is
 * created under the new key and the old one is deleted; landing on another row is refused.
 */
export async function saveRsvp(invitationId, row, { previousKey } = {}) {
  const Rsvp = cookieDataClient().models.Rsvp;
  const { phone, name, attending, guestCount, eventIds, meal, message } = row;
  const derived = rsvpKeyFor({ phone, name });
  const hasPhone = Boolean(derived.phoneKey);
  const rsvpKey = hasPhone ? derived.rsvpKey : previousKey?.startsWith("staff#") ? previousKey : `staff#${randomUUID()}`;
  const fields = {
    invitationId,
    rsvpKey,
    name,
    phone: phone || null,
    phoneKey: hasPhone ? derived.phoneKey : null,
    attending,
    guestCount: guestCount ?? null,
    eventIds: eventIds ?? [],
    meal: meal || null,
    message: message || null,
    source: "staff",
  };
  const rekeyed = Boolean(previousKey) && previousKey !== rsvpKey;
  let exists = previousKey === rsvpKey;
  if (!exists && (hasPhone || rekeyed)) {
    const found = await Rsvp.get({ invitationId, rsvpKey });
    failIfErrors(found.errors);
    exists = Boolean(found.data);
    if (exists && rekeyed) throw new RsvpConflict();
  }
  const { errors } = exists ? await Rsvp.update(fields) : await Rsvp.create(fields);
  failIfErrors(errors);
  if (rekeyed) {
    const removed = await Rsvp.delete({ invitationId, rsvpKey: previousKey });
    failIfErrors(removed.errors);
  }
  return { rsvpKey };
}

export async function removeRsvp(invitationId, rsvpKey) {
  const { errors } = await cookieDataClient().models.Rsvp.delete({ invitationId, rsvpKey });
  failIfErrors(errors);
}

async function mutate(name, args) {
  const { data, errors } = await cookieDataClient().mutations[name](args);
  return { data: data == null ? null : parseAwsJson(data), errors };
}

export const regenerateFamilyTokenRecord = (id) => mutate("regenerateFamilyToken", { id });
export const markSeenRecord = (id) => mutate("markRsvpsSeen", { id });
