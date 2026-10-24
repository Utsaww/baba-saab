import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.RSVP_IP_SALT = "salt-from-env";
});

vi.mock("./submit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./submit")>();
  return { ...actual, submit: vi.fn(async () => ({ ok: true, updated: false })) };
});
vi.mock("./family", () => ({ family: vi.fn(async () => null) }));

import { family } from "./family";
import { handler } from "./handler";
import { RsvpError, submit } from "./submit";

// Guests have no identity and no groups.
const event = (fieldName: string, args: Record<string, unknown> = {}) => ({ fieldName, arguments: args, identity: null });

describe("rsvp-guest handler", () => {
  beforeEach(() => {
    vi.mocked(submit).mockClear();
    vi.mocked(family).mockClear();
  });

  it("serves submitRsvp to guests without any login", async () => {
    const args = { slug: "a-b", reply: { name: "x" }, clientIp: "203.0.113.7" };
    await expect(handler(event("submitRsvp", args))).resolves.toEqual({ ok: true, updated: false });
    expect(submit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rsvp: expect.any(String) }),
      args,
      expect.any(Number),
      "salt-from-env",
    );
  });
  it("refuses to start when RSVP_IP_SALT is missing or empty", async () => {
    for (const value of ["", undefined]) {
      vi.resetModules();
      if (value === undefined) vi.stubEnv("RSVP_IP_SALT", undefined as unknown as string);
      else vi.stubEnv("RSVP_IP_SALT", value);
      await expect(import("./handler")).rejects.toThrow("RSVP_IP_SALT");
    }
    vi.unstubAllEnvs();
  });
  it("serves familyRsvps to guests without any login", async () => {
    await expect(handler(event("familyRsvps", { slug: "a-b", token: "t" }))).resolves.toBeNull();
    expect(family).toHaveBeenCalledWith(expect.anything(), expect.anything(), { slug: "a-b", token: "t" });
  });
  it("refuses any other field", async () => {
    await expect(handler(event("listRsvps"))).rejects.toMatchObject({ name: "Unknown" });
    await expect(handler(event("regenerateFamilyToken", { id: "inv-1" }))).rejects.toMatchObject({ name: "Unknown" });
    expect(submit).not.toHaveBeenCalled();
    expect(family).not.toHaveBeenCalled();
  });
  it("passes typed refusals through so the website can tell them apart", async () => {
    vi.mocked(submit).mockRejectedValueOnce(new RsvpError("Closed", "RSVPs are closed."));
    await expect(handler(event("submitRsvp", {}))).rejects.toMatchObject({ name: "Closed" });
  });
  it("hides unexpected errors behind a generic message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(family).mockRejectedValueOnce(new Error("AccessDeniedException: arn:aws:dynamodb:..."));
    await expect(handler(event("familyRsvps", {}))).rejects.toThrow("Something went wrong. Please try again.");
    log.mockRestore();
  });
});
