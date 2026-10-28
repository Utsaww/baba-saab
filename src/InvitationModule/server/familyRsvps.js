import { cache } from "react";
import { generateServerClientUsingReqRes } from "@aws-amplify/adapter-nextjs/data";
import { outputs, runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { parseAwsJson } from "@/AdminModule/invitations/content";

// Families have no login either: the secret token in the link is checked by the backend.
const client = generateServerClientUsingReqRes({ config: outputs, authMode: "identityPool" });

/** `null` when the link is wrong or gone; throws when the backend fails. */
export async function loadFamilyRsvps(slug, token) {
  const { data, errors } = await runWithAmplifyServerContext({
    nextServerContext: null,
    operation: (ctx) => client.queries.familyRsvps(ctx, { slug, token }),
  });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (data == null) return null;
  return parseAwsJson(data);
}

/** One lookup per request, shared by generateMetadata and the page. */
export const getFamilyRsvps = cache(loadFamilyRsvps);
