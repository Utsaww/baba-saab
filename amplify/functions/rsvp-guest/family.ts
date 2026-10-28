import { createHash, timingSafeEqual } from "node:crypto";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { asContent } from "./keys";
import { findInvitation, type Db, type Tables } from "./submit";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Constant-time comparison of the family token. Hashing first gives equal-length buffers, so neither the
 * content nor the length of the stored token leaks through timing. An empty or missing token never matches.
 */
export function tokenMatches(given: unknown, stored: unknown): boolean {
  if (typeof given !== "string" || typeof stored !== "string" || given === "" || stored === "") return false;
  return timingSafeEqual(sha(given), sha(stored));
}

const VISIBLE = ["draft", "published", "offline"];

/**
 * The private family page's data: only with the invitation's exact family token, and never for a deleted one.
 * Read-only; returns every reply (with phone numbers) newest first, and nothing else from the invitation record.
 */
export async function family(db: Db, tables: Tables, { slug, token }: { slug: unknown; token: unknown }) {
  if (typeof token !== "string" || token === "") return null;
  const inv = await findInvitation(db, tables, slug);
  if (!inv || !VISIBLE.includes(inv.status)) return null;
  if (!tokenMatches(token, inv.familyToken)) return null;

  const content = asContent(inv.publishedContent) ?? asContent(inv.content) ?? {};
  const rows: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: tables.rsvp,
        KeyConditionExpression: "invitationId = :id",
        ExpressionAttributeValues: { ":id": inv.id },
        ExclusiveStartKey,
      }),
    );
    for (const { invitationId: _id, __typename: _t, ...row } of page.Items ?? []) rows.push(row);
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  const at = (r: Record<string, unknown>) => String(r.updatedAt ?? r.createdAt ?? "");
  rows.sort((a, b) => at(b).localeCompare(at(a)));

  const couple = content.couple ?? {};
  return {
    couple: { bride: couple.bride, groom: couple.groom, order: couple.order },
    language: content.language,
    events: (Array.isArray(content.events) ? content.events : []).map((e: any) => ({ id: e?.id, name: e?.name })),
    rows,
  };
}
