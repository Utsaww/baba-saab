import { describe, expect, it } from "vitest";
import { parseAdminCreateArgs } from "./args";

describe("parseAdminCreateArgs", () => {
  it("takes the email and defaults to the sandbox outputs file", () => {
    expect(parseAdminCreateArgs(["owner@example.com"])).toEqual({
      email: "owner@example.com",
      outputsPath: "amplify_outputs.json",
    });
  });

  it("accepts --outputs for a deployed branch", () => {
    expect(parseAdminCreateArgs(["--outputs", ".amplify/main/amplify_outputs.json", "owner@example.com"])).toEqual({
      email: "owner@example.com",
      outputsPath: ".amplify/main/amplify_outputs.json",
    });
  });

  it("explains usage when the email is missing", () => {
    expect(() => parseAdminCreateArgs([])).toThrow("Usage: npm run admin:create -- <email> [--outputs <path>]");
  });

  it("rejects --outputs without a path and extra arguments", () => {
    expect(() => parseAdminCreateArgs(["owner@example.com", "--outputs"])).toThrow("Usage:");
    expect(() => parseAdminCreateArgs(["a@example.com", "b@example.com"])).toThrow("Usage:");
  });
});
