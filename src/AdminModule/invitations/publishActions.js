"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { addDays, defaultOfflineOn, todayIST } from "@/InvitationModule/lib/lifecycle";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { validateSlug } from "@/InvitationModule/lib/slug";
import { getInvitation, publishRecord, regenerateTokenRecord, setSlugRecord, slugOwner, updateLiveRecord } from "./data";
import { PUBLISH_FAILED, publishFailure } from "./publishing";
import { wait } from "./wait";

const STALE_RETRIES = 3;
const STALE_DELAY_MS = 200;

function refresh(id) {
  revalidatePath(`/admin/invitations/${id}/edit`);
  revalidatePath("/admin/invitations");
}

async function attempt(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("publish action failed", err);
    return { ok: false, message: PUBLISH_FAILED };
  }
}

export async function checkSlugAction({ id, slug }) {
  await requireStaff();
  const invalid = validateSlug(slug);
  if (invalid) return { status: "invalid", message: invalid };
  return attempt(async () => {
    const owner = await slugOwner(slug);
    return owner && owner !== id ? { status: "taken", message: "Already taken — try another." } : { status: "available" };
  });
}

export async function setSlugAction({ id, slug }) {
  await requireStaff();
  const invalid = validateSlug(slug);
  if (invalid) return { ok: false, message: invalid };
  return attempt(async () => {
    const { data, errors } = await setSlugRecord({ id, slug });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, slug: data.slug };
  });
}

export async function newPreviewLinkAction({ id }) {
  await requireStaff();
  return attempt(async () => {
    const { data, errors } = await regenerateTokenRecord(id);
    if (errors?.length || !data) return publishFailure(errors);
    return { ok: true, previewToken: data.previewToken };
  });
}

/**
 * Re-reads the stored draft and runs the publish checklist on exactly the version being published.
 * The read is eventually consistent and the editor saves just before publishing, so a version older than
 * expected is re-read a few times before it counts as a conflict. A newer version is a conflict at once.
 */
async function approved(id, expectedVersion) {
  let inv = await getInvitation(id);
  for (let retry = 0; inv && inv.version < expectedVersion && retry < STALE_RETRIES; retry += 1) {
    await wait(STALE_DELAY_MS);
    inv = await getInvitation(id);
  }
  if (!inv) return { stop: { ok: false, message: "That invitation no longer exists." } };
  if (inv.version !== expectedVersion) return { stop: { ok: false, conflict: true } };
  const draft = cleanDraft(inv.content).draft ?? {};
  const missing = publishChecklist(draft).map(({ message, step }) => ({ message, step }));
  if (missing.length) return { stop: { ok: false, message: "Some details are still missing.", missing } };
  return { inv, draft };
}

/** The default Take offline on date, but never before tomorrow: publishing after the wedding mustn't go offline that night. */
function firstOfflineOn(draft) {
  const date = defaultOfflineOn(draft);
  if (!date) return null;
  const tomorrow = addDays(todayIST(), 1);
  return date < tomorrow ? tomorrow : date;
}

export async function publishAction({ id, expectedVersion, slug }) {
  await requireStaff();
  // Set once a changed link name has been saved: the old one is released by then, so even a failed
  // publish reports the new name and the editor's preview link keeps working.
  let savedSlug = null;
  const result = await attempt(async () => {
    const { stop, inv, draft } = await approved(id, expectedVersion);
    if (stop) return stop;
    let finalSlug = inv.slug;
    if (slug && slug !== inv.slug) {
      const invalid = validateSlug(slug);
      if (invalid) return { ok: false, message: invalid };
      const set = await setSlugRecord({ id, slug });
      if (set.errors?.length || !set.data) return publishFailure(set.errors);
      finalSlug = savedSlug = set.data.slug;
    }
    const { data, errors } = await publishRecord({ id, expectedVersion, offlineOn: firstOfflineOn(draft) });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, status: data.status, slug: finalSlug, liveVersion: data.liveVersion, publishedAt: data.publishedAt, liveUpdatedAt: data.liveUpdatedAt };
  });
  if (!result.ok && savedSlug) {
    refresh(id);
    return { ...result, slug: savedSlug };
  }
  return result;
}

export async function updateLiveAction({ id, expectedVersion }) {
  await requireStaff();
  return attempt(async () => {
    const { stop } = await approved(id, expectedVersion);
    if (stop) return stop;
    const { data, errors } = await updateLiveRecord({ id, expectedVersion });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, liveVersion: data.liveVersion, liveUpdatedAt: data.liveUpdatedAt };
  });
}
