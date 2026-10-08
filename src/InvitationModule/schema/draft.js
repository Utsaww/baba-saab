import { z } from "zod";
import { TEMPLATE_IDS, invitationSchema } from "./invitation";

// Makes every field optional all the way down. zod's deepPartial() does not look inside
// .default() wrappers, so list items would keep required fields. Defaults are not applied in drafts.
function toDraft(schema) {
  if (schema instanceof z.ZodDefault) return toDraft(schema._def.innerType);
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) return toDraft(schema.unwrap());
  if (schema instanceof z.ZodObject) {
    const shape = {};
    for (const [key, field] of Object.entries(schema.shape)) shape[key] = toDraft(field);
    return z.object(shape).optional();
  }
  if (schema instanceof z.ZodArray) return z.array(toDraft(schema.element)).optional();
  return schema.optional();
}

// Every field optional, so a half-finished invitation always saves.
export const draftSchema = toDraft(invitationSchema);

export const pathKey = (path) => path.join(".");

function withoutPath(value, path) {
  const [head, ...rest] = path;
  if (Array.isArray(value)) {
    const copy = [...value];
    if (rest.length === 0) copy.splice(head, 1);
    else copy[head] = withoutPath(copy[head], rest);
    return copy;
  }
  if (value && typeof value === "object") {
    const copy = { ...value };
    if (rest.length === 0) delete copy[head];
    else copy[head] = withoutPath(copy[head], rest);
    return copy;
  }
  return value;
}

// Each pass removes one offending field; a real draft has far fewer bad fields than this.
const MAX_PASSES = 200;

/**
 * Validates a draft field by field. A value that breaks its own rule is dropped (saved as blank)
 * and reported in `errors`, so one bad field never blocks the rest of the save.
 * `draft` is null when the template or palette is missing: every save needs those.
 */
export function cleanDraft(input) {
  const errors = {};
  let value = input && typeof input === "object" ? input : {};
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const result = draftSchema.safeParse(value);
    if (result.success) {
      const draft = result.data;
      const valid = TEMPLATE_IDS.includes(draft.templateId) && Boolean(draft.theme?.palette);
      return { draft: valid ? draft : null, errors };
    }
    const issue = result.error.issues[0];
    if (issue.path.length === 0) return { draft: null, errors };
    const key = pathKey(issue.path);
    if (!(key in errors)) errors[key] = issue.message;
    let path = issue.path;
    let next = withoutPath(value, path);
    // No progress (the field was already absent): remove the parent instead.
    while (JSON.stringify(next) === JSON.stringify(value)) {
      path = path.slice(0, -1);
      if (path.length === 0) return { draft: null, errors };
      next = withoutPath(value, path);
    }
    value = next;
  }
  return { draft: null, errors };
}
