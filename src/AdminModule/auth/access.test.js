import { describe, expect, it } from "vitest";
import { decideAdminAccess, groupsFromTokens, safeNextPath, sessionFromTokens } from "./access";

const tokens = (groups, extra = {}) => ({
  accessToken: { payload: { username: "u-1", ...(groups ? { "cognito:groups": groups } : {}) } },
  idToken: { payload: { email: "priya@example.com" } },
  ...extra,
});

describe("groupsFromTokens", () => {
  it("reads Cognito groups from the access token", () => {
    expect(groupsFromTokens(tokens(["admin", "owner"]))).toEqual(["admin", "owner"]);
  });

  it("returns no groups when there are none or no tokens", () => {
    expect(groupsFromTokens(tokens(undefined))).toEqual([]);
    expect(groupsFromTokens(null)).toEqual([]);
  });
});

describe("sessionFromTokens", () => {
  it("summarises who is signed in", () => {
    expect(sessionFromTokens(tokens(["admin"]))).toEqual({
      username: "u-1",
      email: "priya@example.com",
      groups: ["admin"],
      isStaff: true,
      isOwner: false,
    });
  });

  it("is null when signed out", () => {
    expect(sessionFromTokens(null)).toBeNull();
    expect(sessionFromTokens({})).toBeNull();
  });
});

describe("decideAdminAccess", () => {
  const staff = ["admin"];
  const owner = ["admin", "owner"];

  it("always lets people reach the login page", () => {
    expect(decideAdminAccess({ pathname: "/admin/login", signedIn: false, groups: [] })).toBe("allow");
    expect(decideAdminAccess({ pathname: "/admin/login", signedIn: true, groups: [] })).toBe("allow");
  });

  it("sends signed-out visitors to log in", () => {
    expect(decideAdminAccess({ pathname: "/admin", signedIn: false, groups: [] })).toBe("login");
    expect(decideAdminAccess({ pathname: "/admin/templates/royal", signedIn: false, groups: [] })).toBe("login");
  });

  it("refuses signed-in users who are not staff", () => {
    expect(decideAdminAccess({ pathname: "/admin", signedIn: true, groups: [] })).toBe("no-access");
  });

  it("lets staff into staff pages", () => {
    expect(decideAdminAccess({ pathname: "/admin", signedIn: true, groups: staff })).toBe("allow");
    expect(decideAdminAccess({ pathname: "/admin/help", signedIn: true, groups: staff })).toBe("allow");
  });

  it("keeps the staff page for the owner only", () => {
    expect(decideAdminAccess({ pathname: "/admin/staff", signedIn: true, groups: staff })).toBe("owner-only");
    expect(decideAdminAccess({ pathname: "/admin/staff/anything", signedIn: true, groups: staff })).toBe("owner-only");
    expect(decideAdminAccess({ pathname: "/admin/staff", signedIn: true, groups: owner })).toBe("allow");
  });

  it("doesn't treat lookalike paths as owner-only or as the login page", () => {
    expect(decideAdminAccess({ pathname: "/admin/staffing", signedIn: true, groups: staff })).toBe("allow");
    expect(decideAdminAccess({ pathname: "/admin/loginx", signedIn: false, groups: [] })).toBe("login");
  });
});

describe("safeNextPath", () => {
  it("keeps admin paths, with their query", () => {
    expect(safeNextPath("/admin/templates/royal?palette=ivory")).toBe("/admin/templates/royal?palette=ivory");
    expect(safeNextPath("/admin")).toBe("/admin");
  });

  it("falls back to the dashboard for anything off-site or odd", () => {
    for (const bad of [
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/admin\evil",
      "/adminx",
      "/",
      "/admin/login",
      "/admin/login?next=/admin",
    ]) {
      expect(safeNextPath(bad)).toBe("/admin");
    }
  });
});
