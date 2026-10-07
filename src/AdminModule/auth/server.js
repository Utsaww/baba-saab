import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "./amplifyServer";
import { LOGIN_PATH, sessionFromTokens } from "./access";

/** Who is signed in, read from the auth cookies on this request, or null. */
export async function getStaffSession() {
  const tokens = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        return (await fetchAuthSession(contextSpec)).tokens ?? null;
      } catch {
        return null;
      }
    },
  });
  return sessionFromTokens(tokens);
}

/** Use in every staff layout, page and server action; the middleware alone is not enough. */
export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) redirect(LOGIN_PATH);
  if (!session.isStaff) redirect(`${LOGIN_PATH}?error=no-access`);
  return session;
}

export async function requireOwner() {
  const session = await requireStaff();
  if (!session.isOwner) redirect("/admin");
  return session;
}
