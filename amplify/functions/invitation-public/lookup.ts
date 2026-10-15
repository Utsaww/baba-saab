import { GetCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type Tables = { invitation: string; slug: string };
type Db = Pick<DynamoDBDocumentClient, "send">;
export type PublicInvitation = { mode: "live" | "preview"; templateId: string; content: unknown };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The only guest-facing read. Enforces every visibility rule and returns only mode, templateId and content.
export async function lookup(
  db: Db,
  tables: Tables,
  { slug, previewToken }: { slug: unknown; previewToken?: string | null },
): Promise<PublicInvitation | null> {
  if (typeof slug !== "string" || slug.length < 3 || slug.length > 60 || !SLUG.test(slug)) return null;

  const { Item: link } = await db.send(new GetCommand({ TableName: tables.slug, Key: { slug } }));
  if (!link?.invitationId) return null;

  const { Item: item } = await db.send(new GetCommand({ TableName: tables.invitation, Key: { id: link.invitationId } }));
  if (!item) return null;

  const tokenOk =
    typeof previewToken === "string" &&
    previewToken !== "" &&
    typeof item.previewToken === "string" &&
    previewToken === item.previewToken;
  if ((item.status === "draft" || item.status === "published") && tokenOk) {
    return { mode: "preview", templateId: item.templateId, content: item.content };
  }
  if (item.status === "published" && item.publishedContent) {
    return { mode: "live", templateId: item.templateId, content: item.publishedContent };
  }
  return null;
}
