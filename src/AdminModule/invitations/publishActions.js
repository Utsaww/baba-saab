"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/AdminModule/auth/server";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { publishChecklist } from "@/InvitationModule/lib/checklist";
import { validateSlug } from "@/InvitationModule/lib/slug";
import { getInvitation, publishRecord, regenerateTokenRecord, setSlugRecord, slugOwner, updateLiveRecord } from "./data";
import { PUBLISH_FAILED, publishFailure } from "./publishing";

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

/** Re-reads the stored draft and runs the publish checklist on exactly the version being published. */
async function approved(id, expectedVersion) {
  const inv = await getInvitation(id);
  if (!inv) return { stop: { ok: false, message: "That invitation no longer exists." } };
  if (inv.version !== expectedVersion) return { stop: { ok: false, conflict: true } };
  const missing = publishChecklist(cleanDraft(inv.content).draft ?? {}).map((item) => item.message);
  if (missing.length) return { stop: { ok: false, message: "Some details are still missing.", missing } };
  return { inv };
}

export async function publishAction({ id, expectedVersion, slug }) {
  await requireStaff();
  return attempt(async () => {
    const { stop, inv } = await approved(id, expectedVersion);
    if (stop) return stop;
    let finalSlug = inv.slug;
    if (slug && slug !== inv.slug) {
      const invalid = validateSlug(slug);
      if (invalid) return { ok: false, message: invalid };
      const set = await setSlugRecord({ id, slug });
      if (set.errors?.length || !set.data) return publishFailure(set.errors);
      finalSlug = set.data.slug;
    }
    const { data, errors } = await publishRecord({ id, expectedVersion });
    if (errors?.length || !data) return publishFailure(errors);
    refresh(id);
    return { ok: true, status: data.status, slug: finalSlug, liveVersion: data.liveVersion, publishedAt: data.publishedAt, liveUpdatedAt: data.liveUpdatedAt };
  });
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
