import { createHash } from "node:crypto";
import { generateServerClientUsingReqRes } from "@aws-amplify/adapter-nextjs/data";
import { outputs, runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { parseAwsJson } from "@/AdminModule/invitations/content";

// Guests have no login: the identity pool's guest role may call submitRsvp (and familyRsvps) only.
const client = generateServerClientUsingReqRes({ config: outputs, authMode: "identityPool" });

const REASONS = { Closed: "closed", RateLimited: "rate", Invalid: "invalid", NotFound: "invalid" };

const respond = (body) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
const fail = (reason) => respond({ ok: false, reason });

function ipHashOf(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(ip + (process.env.RSVP_IP_SALT ?? "baba-saab-rsvp")).digest("hex");
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return fail("invalid");
    }
    const { slug, reply } = body ?? {};
    if (typeof slug !== "string" || !slug || !reply || typeof reply !== "object" || Array.isArray(reply)) return fail("invalid");

    const { data, errors } = await runWithAmplifyServerContext({
      nextServerContext: null,
      operation: (ctx) => client.mutations.submitRsvp(ctx, { slug, reply: JSON.stringify(reply), ipHash: ipHashOf(request) }),
    });
    if (errors?.length) return fail(REASONS[errors[0].errorType] ?? "error");
    const result = parseAwsJson(data);
    return respond({ ok: true, updated: Boolean(result.updated) });
  } catch (err) {
    console.error("rsvp submit failed", err);
    return fail("error");
  }
}
