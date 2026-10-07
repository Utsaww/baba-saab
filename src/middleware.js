import { NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { decideAdminAccess, groupsFromTokens, LOGIN_PATH } from "@/AdminModule/auth/access";

export async function middleware(request) {
  const response = NextResponse.next();
  const tokens = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        // With a response in context, refreshed tokens are written back as cookies.
        return (await fetchAuthSession(contextSpec)).tokens ?? null;
      } catch {
        return null;
      }
    },
  });

  const { pathname, search } = request.nextUrl;
  const decision = decideAdminAccess({ pathname, signedIn: Boolean(tokens?.accessToken), groups: groupsFromTokens(tokens) });
  if (decision === "allow") return response;

  const url = request.nextUrl.clone();
  url.search = "";
  if (decision === "login") {
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname + search);
  } else if (decision === "no-access") {
    url.pathname = LOGIN_PATH;
    url.searchParams.set("error", "no-access");
  } else {
    url.pathname = "/admin";
  }
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
