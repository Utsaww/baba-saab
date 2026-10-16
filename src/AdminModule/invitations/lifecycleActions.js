"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { isIsoDate } from "@/InvitationModule/lib/lifecycle";
import { deleteRecord, eraseNowRecord, putOnlineRecord, restoreRecord, setOfflineOnRecord, takeOfflineRecord } from "./data";
import { publishFailure } from "./publishing";

const LIFECYCLE_FAILED = "Couldn't save that change. Check your connection and try again.";
const BAD_DATE = { ok: false, message: "Pick a date after today" };

function refresh(id) {
  revalidatePath(`/admin/invitations/${id}/edit`);
  revalidatePath("/admin/invitations");
}

async function attempt(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("lifecycle action failed", err);
    return { ok: false, message: LIFECYCLE_FAILED };
  }
}

/** Runs one lifecycle mutation: failure mapping, page refresh, and the success shape from `pick`. */
function run(id, call, pick) {
  return attempt(async () => {
    const { data, errors } = await call();
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, ...pick(data) };
  });
}

const state = ({ status, offlineAt, purgeAt }) => ({ status, offlineAt, purgeAt });
const dates = ({ status, offlineOn, offlineAt, purgeAt, deletedAt }) => ({ status, offlineOn, offlineAt, purgeAt, deletedAt });

export async function takeOfflineAction({ id, expectedVersion }) {
  await requireStaff();
  return run(id, () => takeOfflineRecord({ id, expectedVersion }), state);
}

export async function putOnlineAction({ id, expectedVersion, offlineOn }) {
  await requireStaff();
  if (!isIsoDate(offlineOn)) return BAD_DATE;
  return run(id, () => putOnlineRecord({ id, expectedVersion, offlineOn }), dates);
}

export async function setOfflineOnAction({ id, expectedVersion, offlineOn }) {
  await requireStaff();
  if (!isIsoDate(offlineOn)) return BAD_DATE;
  return run(id, () => setOfflineOnRecord({ id, expectedVersion, offlineOn }), dates);
}

export async function deleteInvitationAction({ id, expectedVersion }) {
  await requireStaff();
  return run(id, () => deleteRecord({ id, expectedVersion }), dates);
}

/** `offlineOn` is only needed when the stored date has passed; a malformed one is refused here. */
export async function restoreInvitationAction({ id, expectedVersion, offlineOn }) {
  await requireStaff();
  if (offlineOn != null && !isIsoDate(offlineOn)) return BAD_DATE;
  return run(id, () => restoreRecord({ id, expectedVersion, offlineOn }), dates);
}

export async function eraseNowAction({ id, confirm }) {
  await requireStaff();
  return run(id, () => eraseNowRecord({ id, confirm }), () => ({}));
}
