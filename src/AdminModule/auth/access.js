// Every rule about who may open which admin page lives here, so the middleware,
// server-side guards and tests all agree.

export const STAFF_GROUP = "admin";
export const OWNER_GROUP = "owner";
export const LOGIN_PATH = "/admin/login";
const HOME_PATH = "/admin";
const OWNER_ONLY_PATHS = ["/admin/staff"];

function isUnder(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Cognito puts a user's groups in the access token. */
export function groupsFromTokens(tokens) {
  const groups = tokens?.accessToken?.payload?.["cognito:groups"];
  return Array.isArray(groups) ? groups : [];
}

export function sessionFromTokens(tokens) {
  if (!tokens?.accessToken) return null;
  const groups = groupsFromTokens(tokens);
  return {
    username: tokens.accessToken.payload.username,
    email: tokens.idToken?.payload?.email ?? "",
    groups,
    isStaff: groups.includes(STAFF_GROUP),
    isOwner: groups.includes(OWNER_GROUP),
  };
}

/** @returns {"allow" | "login" | "no-access" | "owner-only"} */
export function decideAdminAccess({ pathname, signedIn, groups }) {
  if (isUnder(pathname, LOGIN_PATH)) return "allow";
  if (!signedIn) return "login";
  if (!groups.includes(STAFF_GROUP)) return "no-access";
  if (OWNER_ONLY_PATHS.some((p) => isUnder(pathname, p)) && !groups.includes(OWNER_GROUP)) return "owner-only";
  return "allow";
}

/** Where to go after signing in. Only admin paths on this site, so ?next= can't send anyone elsewhere. */
export function safeNextPath(next) {
  if (typeof next !== "string" || next.includes("\\") || next.startsWith("//")) return HOME_PATH;
  const pathname = next.split(/[?#]/)[0];
  if (!isUnder(pathname, HOME_PATH) || isUnder(pathname, LOGIN_PATH)) return HOME_PATH;
  return next;
}
