"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { RsvpConflict, listRsvps, markSeenRecord, regenerateFamilyTokenRecord, removeRsvp, saveRsvp } from "./data";

const FAILED = "Couldn't save that change. Check your connection and try again.";

/** Best effort: the change is already saved, so a cache hiccup must not look like a failed save. */
function refresh(id) {
  try {
    revalidatePath(`/admin/invitations/${id}/edit`);
  } catch (err) {
    console.error("rsvp revalidate failed", err);
  }
}

async function attempt(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RsvpConflict) return { ok: false, message: err.message };
    console.error("rsvp action failed", err);
    return { ok: false, message: FAILED };
  }
}

export async function listRsvpsAction(invitationId) {
  await requireStaff();
  return attempt(async () => ({ ok: true, rows: await listRsvps(invitationId) }));
}

export async function saveRsvpAction(invitationId, row, options = {}) {
  await requireStaff();
  const r = await attempt(async () => ({ ok: true, ...(await saveRsvp(invitationId, row, { previousKey: options?.previousKey })) }));
  if (r.ok) refresh(invitationId);
  return r;
}

export async function removeRsvpAction(invitationId, rsvpKey) {
  await requireStaff();
  const r = await attempt(async () => {
    await removeRsvp(invitationId, rsvpKey);
    return { ok: true };
  });
  if (r.ok) refresh(invitationId);
  return r;
}

export async function newFamilyLinkAction(invitationId) {
  await requireStaff();
  const r = await attempt(async () => {
    const { data, errors } = await regenerateFamilyTokenRecord(invitationId);
    if (errors?.length || !data?.familyToken) return { ok: false, message: FAILED };
    return { ok: true, familyToken: data.familyToken };
  });
  if (r.ok) refresh(invitationId);
  return r;
}

export async function markRsvpsSeenAction(invitationId) {
  await requireStaff();
  const r = await attempt(async () => {
    const { data, errors } = await markSeenRecord(invitationId);
    if (errors?.length || !data) return { ok: false, message: FAILED };
    return { ok: true };
  });
  if (r.ok) refresh(invitationId);
  return r;
}
