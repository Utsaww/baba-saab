import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { family } from "./family";
import { RsvpError, submit } from "./submit";

// Guests have no login: AppSync allows only these two fields for the guest role, and each enforces its own rules.
type Event = { fieldName: string; arguments: Record<string, any> };

const db = DynamoDBDocumentClient.from(new DynamoDBClient());
const tables = {
  invitation: process.env.INVITATION_TABLE ?? "",
  slug: process.env.INVITATION_SLUG_TABLE ?? "",
  rsvp: process.env.RSVP_TABLE ?? "",
  limit: process.env.RSVP_LIMIT_TABLE ?? "",
};

// Salts the guest's network address before it becomes a rate-limit key. Set per deploy in backend.ts; without it the
// hashes would be reversible, so refuse to start at all.
const ipSalt = process.env.RSVP_IP_SALT ?? "";
if (!ipSalt) throw new Error("rsvp-guest: RSVP_IP_SALT is not set");

export const handler = async (event: Event) => {
  const a = event.arguments ?? {};
  try {
    switch (event.fieldName) {
      case "submitRsvp":
        return await submit(db, tables, { slug: a.slug, reply: a.reply, clientIp: a.clientIp }, Date.now(), ipSalt);
      case "familyRsvps":
        return await family(db, tables, { slug: a.slug, token: a.token });
      default:
        throw new RsvpError("Unknown", `Unknown operation ${event.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof RsvpError) throw err;
    console.error("rsvp-guest failed", event.fieldName, err);
    throw new Error("Something went wrong. Please try again.");
  }
};
