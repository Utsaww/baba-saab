"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/AdminModule/auth/server";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { LANGUAGES } from "@/InvitationModule/schema/invitation";
import { getTemplate } from "@/InvitationModule/templates/registry";
import { createInvitationRecord, saveInvitationRecord } from "./data";
import { prepareSave, SAVE_FAILED, saveResult } from "./content";

export async function createInvitationAction({ templateId, palette, language }) {
  const session = await requireStaff();
  const template = getTemplate(templateId);
  const { draft } = cleanDraft({ templateId, theme: { palette }, language });
  if (!template || !template.palettes.some((p) => p.id === palette) || !LANGUAGES.includes(language) || !draft) {
    return { ok: false, message: "Choose a template, a palette and a language." };
  }

  let id;
  try {
    id = await createInvitationRecord({ content: draft, email: session.email });
  } catch (err) {
    console.error("createInvitation failed", err);
    return { ok: false, message: "Couldn't create the invitation. Please try again." };
  }
  revalidatePath("/admin/invitations");
  // redirect() throws, so it stays outside the try.
  redirect(`/admin/invitations/${id}/edit?step=2`);
}

export async function saveInvitationAction({ id, expectedVersion, content }) {
  const session = await requireStaff();
  const prepared = prepareSave({ id, expectedVersion, content });
  if (!prepared.ok) return prepared;

  try {
    const { data, errors } = await saveInvitationRecord({
      id,
      expectedVersion,
      content: prepared.content,
      fields: prepared.fields,
      email: session.email,
    });
    const result = saveResult({ data, errors });
    if (!result.ok && !result.conflict) console.error("saveInvitation failed", errors);
    if (result.ok) {
      // Next caches dynamic pages client-side; without this, reopening shows the old content and version.
      revalidatePath(`/admin/invitations/${id}/edit`);
      revalidatePath("/admin/invitations");
    }
    return result;
  } catch (err) {
    console.error("saveInvitation failed", err);
    return { ok: false, message: SAVE_FAILED };
  }
}
