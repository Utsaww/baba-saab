import { generateServerClientUsingReqRes } from "@aws-amplify/adapter-nextjs/data";
import { outputs, runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { parseAwsJson } from "@/AdminModule/invitations/content";

// Guests have no login: the identity pool's guest role may call submitRsvp (and familyRsvps) only.
const client = generateServerClientUsingReqRes({ config: outputs, authMode: "identityPool" });

const REASONS = { Closed: "closed", RateLimited: "rate", Invalid: "invalid", NotFound: "invalid" };

const MAX_BODY = 10 * 1024;
const SLUG = /^[a-z0-9-]{3,60}$/;
const STRING_FIELDS = ["name", "phone", "attending", "meal", "message", "website"];

/** Shape only (types); the backend owns the real rules. */
function shapeOk(reply) {
  if (!reply || typeof reply !== "object" || Array.isArray(reply)) return false;
  if (STRING_FIELDS.some((k) => reply[k] != null && typeof reply[k] !== "string")) return false;
  if (reply.guestCount != null && typeof reply.guestCount !== "number") return false;
  if (reply.eventIds != null && !(Array.isArray(reply.eventIds) && reply.eventIds.every((e) => typeof e === "string"))) return false;
  return true;
}

const respond = (body) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
const fail = (reason) => respond({ ok: false, reason });

// The guest's network address, for the per-network rate limit. rsvp-guest salts and hashes it with a per-deploy
// secret before using it; the raw address is never stored.
function clientIpOf(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return ip.slice(0, 64);
}

export async function POST(request) {
  try {
    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY) return fail("invalid");
      body = JSON.parse(text);
    } catch {
      return fail("invalid");
    }
    const { slug, reply } = body ?? {};
    if (typeof slug !== "string" || !SLUG.test(slug) || !shapeOk(reply)) return fail("invalid");

    const { data, errors } = await runWithAmplifyServerContext({
      nextServerContext: null,
      operation: (ctx) => client.mutations.submitRsvp(ctx, { slug, reply: JSON.stringify(reply), clientIp: clientIpOf(request) }),
    });
    if (errors?.length) return fail(REASONS[errors[0].errorType] ?? "error");
    const result = parseAwsJson(data);
    return respond({ ok: true, updated: Boolean(result.updated) });
  } catch (err) {
    console.error("rsvp submit failed", err);
    return fail("error");
  }
}
