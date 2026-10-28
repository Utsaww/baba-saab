import { createHash } from "node:crypto";
import { GetCommand, PutCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { asContent, isRsvpClosed, isSlug, isWhatsappNumber, rsvpKeyFor, validateRsvpInput, whatsappRsvpOn } from "./keys";

export type Tables = { invitation: string; slug: string; rsvp: string; limit: string };
export type Db = Pick<DynamoDBDocumentClient, "send">;

// AppSync reports a Lambda error's `name` as its errorType, which the website maps to a reason.
export class RsvpError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

export const PHONE_LIMIT = 5; // replies per phone per hour
export const IP_LIMIT = 60; // replies per network address per hour: a venue's Wi-Fi or a carrier can share one
const HOUR_MS = 3_600_000;
const NAME_MAX = 100;
const MESSAGE_MAX = 1000;
const MEALS = ["veg", "nonveg", "jain"];
const CLIENT_IP_MAX = 64; // the website's /api/rsvp route passes the first forwarded address, capped at 64

/** The invitation a link name points at, or null. */
export async function findInvitation(db: Db, tables: Pick<Tables, "invitation" | "slug">, slug: unknown) {
  if (!isSlug(slug)) return null;
  const { Item: link } = await db.send(new GetCommand({ TableName: tables.slug, Key: { slug } }));
  if (!link?.invitationId) return null;
  const { Item } = await db.send(new GetCommand({ TableName: tables.invitation, Key: { id: link.invitationId } }));
  return Item ?? null;
}

const invalid = () => new RsvpError("Invalid", "Please check your reply and try again.");
const notFound = () => new RsvpError("NotFound", "This invitation isn't taking replies.");

/** The guest's reply, cleaned to only what the live invitation asks for. Throws Invalid. */
function cleanReply(raw: unknown, live: Record<string, any>) {
  const r = asContent(raw);
  if (!r) throw invalid();
  const rsvp = live.rsvp ?? {};
  for (const f of ["name", "phone", "attending"]) if (typeof r[f] !== "string") throw invalid();
  if (r.message != null && typeof r.message !== "string") throw invalid();
  if (r.eventIds != null && !Array.isArray(r.eventIds)) throw invalid();
  if (Object.keys(validateRsvpInput(r, { askGuestCount: rsvp.askGuestCount })).length) throw invalid();
  const name = r.name.trim();
  const message = (r.message ?? "").trim();
  if (name.length > NAME_MAX || message.length > MESSAGE_MAX) throw invalid();

  const attending = r.attending as "yes" | "no" | "maybe";
  const coming = attending !== "no";
  const known = new Set((live.events ?? []).map((e: any) => e?.id).filter((id: unknown) => typeof id === "string"));
  return {
    name,
    phone: r.phone.trim(),
    attending,
    guestCount: rsvp.askGuestCount && coming ? Number(r.guestCount) : undefined,
    // Events staff removed since the guest loaded the page are dropped, not refused.
    eventIds: coming ? [...new Set((r.eventIds ?? []).filter((id: unknown) => known.has(id)))] as string[] : [],
    meal: rsvp.askMeal && coming && MEALS.includes(r.meal) ? (r.meal as string) : undefined,
    message: message || undefined,
  };
}

/** One atomic count per key and hour. Refuses once `max` is reached; the item expires an hour from now (TTL). */
async function countOrRefuse(db: Db, table: string, key: string, max: number, nowMs: number) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: table,
        Key: { key },
        UpdateExpression:
          "ADD #count :one SET expiresAt = if_not_exists(expiresAt, :exp), createdAt = if_not_exists(createdAt, :now), updatedAt = :now, #tn = :tn",
        ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
        ExpressionAttributeNames: { "#count": "count", "#tn": "__typename" },
        ExpressionAttributeValues: {
          ":one": 1,
          ":max": max,
          ":exp": Math.floor(nowMs / 1000) + 3600,
          ":now": new Date(nowMs).toISOString(),
          ":tn": "RsvpLimit",
        },
      }),
    );
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new RsvpError("RateLimited", "Too many replies — please try again later.");
    }
    throw err;
  }
}

/**
 * Saves a guest's reply to a live invitation. Every rule is checked against the published copy, never the draft.
 * Same phone + same name replaces that guest's earlier reply (keeping when they first replied).
 */
export async function submit(
  db: Db,
  tables: Tables,
  { slug, reply, clientIp }: { slug: unknown; reply: unknown; clientIp: unknown },
  nowMs: number,
  ipSalt: string,
): Promise<{ ok: true; updated: boolean }> {
  if (!ipSalt) throw new Error("rsvp-guest: RSVP_IP_SALT is not set");
  const raw = asContent(reply);
  if (!raw) throw invalid();
  if (raw.website) throw invalid(); // a bot filled the hidden field
  const ip = typeof clientIp === "string" ? clientIp.trim() : "";
  if (!ip || ip.length > CLIENT_IP_MAX) throw invalid();
  // Only the salted hash is used: the raw address is never stored or logged.
  const ipHash = createHash("sha256").update(ip + ipSalt).digest("hex");
  if (!isSlug(slug)) throw notFound();

  const inv = await findInvitation(db, tables, slug);
  const live = inv?.status === "published" ? asContent(inv.publishedContent) : null;
  if (!inv || !live || !whatsappRsvpOn(live.rsvp) || !isWhatsappNumber(live.hosts?.contactPhone)) throw notFound();
  if (isRsvpClosed(live.rsvp, nowMs)) throw new RsvpError("Closed", "RSVPs are closed.");

  const clean = cleanReply(raw, live);
  const { phoneKey, rsvpKey } = rsvpKeyFor(clean);
  const hour = Math.floor(nowMs / HOUR_MS);
  await countOrRefuse(db, tables.limit, `phone#${phoneKey}#${hour}`, PHONE_LIMIT, nowMs);
  await countOrRefuse(db, tables.limit, `ip#${ipHash}#${hour}`, IP_LIMIT, nowMs);

  const invitationId = inv.id as string;
  const { Item: earlier } = await db.send(
    new GetCommand({ TableName: tables.rsvp, Key: { invitationId, rsvpKey }, ConsistentRead: true }),
  );
  const now = new Date(nowMs).toISOString();
  // Server-owned fields go last so nothing in the reply can ever override them.
  const item: Record<string, unknown> = {
    ...clean,
    invitationId,
    rsvpKey,
    phoneKey,
    source: "guest",
    __typename: "Rsvp",
    createdAt: typeof earlier?.createdAt === "string" ? earlier.createdAt : now,
    updatedAt: now,
  };
  for (const k of Object.keys(item)) if (item[k] === undefined) delete item[k];
  await db.send(new PutCommand({ TableName: tables.rsvp, Item: item }));

  // The "N new" badge for staff. Conditional so an invitation erased meanwhile isn't recreated as a bare row.
  // The reply itself is saved either way, so a failure here is only logged.
  try {
    await db.send(
      new UpdateCommand({
        TableName: tables.invitation,
        Key: { id: invitationId },
        UpdateExpression: "ADD rsvpNewCount :one",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: { ":one": 1 },
      }),
    );
  } catch (err) {
    console.warn("rsvp-guest: new-reply count not bumped", invitationId, err);
  }
  return { ok: true, updated: Boolean(earlier) };
}
