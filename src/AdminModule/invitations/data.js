import { cookieDataClient } from "@/AdminModule/dataClient";
import { indexFields } from "@/InvitationModule/lib/indexFields";
import { parseContent } from "./content";

const LIST_FIELDS = ["id", "status", "templateId", "mainDate", "coupleNames", "searchText", "updatedAt", "updatedBy"];

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
  return { id: data.id, version: data.version, updatedAt: data.updatedAt, content: parseContent(data.content) };
}

export async function createInvitationRecord({ content, email }) {
  const { data, errors } = await cookieDataClient().models.Invitation.create({
    status: "draft",
    ...indexFields(content),
    content: JSON.stringify(content),
    version: 1,
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
