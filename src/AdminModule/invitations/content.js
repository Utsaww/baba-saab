import { cleanDraft } from "@/InvitationModule/schema/draft";
import { indexFields } from "@/InvitationModule/lib/indexFields";

export const SAVE_FAILED = "Couldn't save. Check your connection and try again.";

/** Amplify returns AWSJSON as a string; accept either form. */
export function parseContent(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function prepareSave({ id, expectedVersion, content }) {
  if (typeof id !== "string" || !id || !Number.isInteger(expectedVersion)) {
    return { ok: false, message: "That save request wasn't valid. Reload the page." };
  }
  const { draft } = cleanDraft(content);
  if (!draft) return { ok: false, message: "Choose a template and palette before saving." };
  return { ok: true, content: JSON.stringify(draft), fields: indexFields(draft) };
}

export function saveResult({ data, errors }) {
  if (errors?.length) {
    if (errors[0].errorType === "VersionConflict") return { ok: false, conflict: true };
    return { ok: false, message: SAVE_FAILED };
  }
  if (!data) return { ok: false, message: SAVE_FAILED };
  return { ok: true, version: data.version, savedAt: data.updatedAt };
}
