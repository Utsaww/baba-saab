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
    const page = await cookieDataClient().models.Rsvp.list({ invitationId: { eq: invitationId }, limit: 100, nextToken });
    failIfErrors(page.errors);
    rows.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return rows;
}

/** Create or update one reply entered by staff. Phone-less rows get a random key so they never collide. */
export async function saveRsvp(invitationId, row) {
  const Rsvp = cookieDataClient().models.Rsvp;
  const { rsvpKey: existingKey, phone, name, attending, guestCount, eventIds, meal, message } = row;
  const phoneKeyed = rsvpKeyFor({ phone, name });
  const hasPhone = Boolean(phoneKeyed.phoneKey);
  const rsvpKey = existingKey || (hasPhone ? phoneKeyed.rsvpKey : `staff#${randomUUID()}`);
  const fields = {
    invitationId,
    rsvpKey,
    name,
    phone: phone || null,
    phoneKey: hasPhone ? phoneKeyed.phoneKey : null,
    attending,
    guestCount: guestCount ?? null,
    eventIds: eventIds ?? [],
    meal: meal || null,
    message: message || null,
    source: "staff",
  };
  let exists = Boolean(existingKey);
  if (!exists && hasPhone) {
    const found = await Rsvp.get({ invitationId, rsvpKey });
    failIfErrors(found.errors);
    exists = Boolean(found.data);
  }
  const { errors } = exists ? await Rsvp.update(fields) : await Rsvp.create(fields);
  failIfErrors(errors);
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
