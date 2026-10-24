"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { listRsvps, markSeenRecord, regenerateFamilyTokenRecord, removeRsvp, saveRsvp } from "./data";

const FAILED = "Couldn't save that change. Check your connection and try again.";

const refresh = (id) => revalidatePath(`/admin/invitations/${id}/edit`);

async function attempt(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("rsvp action failed", err);
    return { ok: false, message: FAILED };
  }
}

export async function listRsvpsAction(invitationId) {
  await requireStaff();
  return attempt(async () => ({ ok: true, rows: await listRsvps(invitationId) }));
}

export async function saveRsvpAction(invitationId, row) {
  await requireStaff();
  return attempt(async () => {
    const { rsvpKey } = await saveRsvp(invitationId, row);
    refresh(invitationId);
    return { ok: true, rsvpKey };
  });
}

export async function removeRsvpAction(invitationId, rsvpKey) {
  await requireStaff();
  return attempt(async () => {
    await removeRsvp(invitationId, rsvpKey);
    refresh(invitationId);
    return { ok: true };
  });
}

export async function newFamilyLinkAction(invitationId) {
  await requireStaff();
  return attempt(async () => {
    const { data, errors } = await regenerateFamilyTokenRecord(invitationId);
    if (errors?.length || !data?.familyToken) return { ok: false, message: FAILED };
    refresh(invitationId);
    return { ok: true, familyToken: data.familyToken };
  });
}

export async function markRsvpsSeenAction(invitationId) {
  await requireStaff();
  return attempt(async () => {
    const { data, errors } = await markSeenRecord(invitationId);
    if (errors?.length || !data) return { ok: false, message: FAILED };
    refresh(invitationId);
    return { ok: true };
  });
}
