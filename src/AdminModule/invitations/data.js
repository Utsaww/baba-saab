import { randomBytes } from "node:crypto";
import { cookieDataClient } from "@/AdminModule/dataClient";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { parseAwsJson, parseContent } from "./content";

const LIST_FIELDS = ["id", "status", "templateId", "mainDate", "coupleNames", "searchText", "updatedAt", "updatedBy", "musicTrackId", "slug", "version", "liveVersion"];

function failIfErrors(errors) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
}

/** Every invitation's list columns (not its content). Fine for hundreds of rows. */
export async function listInvitations() {
  const client = cookieDataClient();
  const rows = [];
  let nextToken = null;
  do {
    const page = await client.models.Invitation.list({ selectionSet: LIST_FIELDS, limit: 100, nextToken });
    failIfErrors(page.errors);
    rows.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return rows;
}

export async function getInvitation(id) {
  const { data, errors } = await cookieDataClient().models.Invitation.get({ id });
  failIfErrors(errors);
  if (!data) return null;
  return {
    id: data.id,
    version: data.version,
    updatedAt: data.updatedAt,
    status: data.status,
    slug: data.slug ?? null,
    previewToken: data.previewToken ?? null,
    liveVersion: data.liveVersion ?? null,
    publishedAt: data.publishedAt ?? null,
    liveUpdatedAt: data.liveUpdatedAt ?? null,
    content: parseContent(data.content),
    publishedContent: data.publishedContent ? parseContent(data.publishedContent) : null,
  };
}

export async function createInvitationRecord({ content, email }) {
  const { data, errors } = await cookieDataClient().models.Invitation.create({
    status: "draft",
    ...indexFields(content),
    content: JSON.stringify(content),
    version: 1,
    previewToken: randomBytes(16).toString("base64url"),
    createdBy: email,
    updatedBy: email,
  });
  failIfErrors(errors);
  if (!data) throw new Error("Invitation.create returned no data");
  return data.id;
}

export function saveInvitationRecord({ id, expectedVersion, content, fields, email }) {
  return cookieDataClient().mutations.saveInvitation({ id, expectedVersion, content, ...fields, updatedBy: email });
}

/** Which invitation owns a link name, or null when it's free. */
export async function slugOwner(slug) {
  const { data, errors } = await cookieDataClient().models.InvitationSlug.get({ slug });
  failIfErrors(errors);
  return data?.invitationId ?? null;
}

async function mutate(name, args) {
  const { data, errors } = await cookieDataClient().mutations[name](args);
  return { data: data == null ? null : parseAwsJson(data), errors };
}

export const setSlugRecord = ({ id, slug }) => mutate("setInvitationSlug", { id, slug });
export const regenerateTokenRecord = (id) => mutate("regeneratePreviewToken", { id });
export const publishRecord = ({ id, expectedVersion }) => mutate("publishInvitation", { id, expectedVersion });
export const updateLiveRecord = ({ id, expectedVersion }) => mutate("updateLiveInvitation", { id, expectedVersion });
