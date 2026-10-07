import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./staff", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./staff")>();
  return {
    ...actual,
    listStaff: vi.fn(async () => [{ username: "u-owner" }]),
    inviteStaff: vi.fn(async () => ({ username: "u-new" })),
    removeStaff: vi.fn(async () => true as const),
  };
});

import { handler } from "./handler";
import { inviteStaff, listStaff, removeStaff, StaffError } from "./staff";

function event(fieldName: string, args: Record<string, unknown> = {}, groups: string[] | null = ["admin", "owner"]) {
  return { typeName: "Mutation", fieldName, arguments: args, identity: { username: "u-owner", sub: "u-owner", groups } };
}

describe("staff-admin handler", () => {
  beforeEach(() => {
    vi.stubEnv("STAFF_USER_POOL_ID", "ap-south-1_TEST");
    vi.mocked(listStaff).mockClear();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects callers outside the owner group", async () => {
    await expect(handler(event("listStaff", {}, ["admin"]))).rejects.toThrow("Only the owner can manage staff.");
    await expect(handler(event("listStaff", {}, null))).rejects.toThrow("Only the owner can manage staff.");
    expect(listStaff).not.toHaveBeenCalled();
  });

  it("rejects a missing identity", async () => {
    await expect(handler({ typeName: "Query", fieldName: "listStaff", arguments: {}, identity: null })).rejects.toThrow(
      "Only the owner can manage staff.",
    );
    expect(listStaff).not.toHaveBeenCalled();
  });

  it("dispatches each operation with the user pool id", async () => {
    await expect(handler(event("listStaff"))).resolves.toEqual([{ username: "u-owner" }]);
    expect(listStaff).toHaveBeenCalledWith(expect.anything(), "ap-south-1_TEST");

    await handler(event("inviteStaff", { email: "a@example.com", name: "A" }));
    expect(inviteStaff).toHaveBeenCalledWith(expect.anything(), "ap-south-1_TEST", { email: "a@example.com", name: "A" });

    await handler(event("removeStaff", { username: "u-amit" }));
    expect(removeStaff).toHaveBeenCalledWith(expect.anything(), "ap-south-1_TEST", {
      username: "u-amit",
      caller: { username: "u-owner", sub: "u-owner" },
    });
  });

  it("passes staff-facing errors through", async () => {
    vi.mocked(listStaff).mockRejectedValueOnce(new StaffError("You can't remove your own account."));
    await expect(handler(event("listStaff"))).rejects.toThrow("You can't remove your own account.");
  });

  it("hides unexpected AWS errors behind a friendly message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(listStaff).mockRejectedValueOnce(new Error("AccessDeniedException: arn:aws:iam::123:role/x"));
    await expect(handler(event("listStaff"))).rejects.toThrow(
      "Something went wrong talking to the sign-in service. Please try again.",
    );
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("rejects unknown operations", async () => {
    await expect(handler(event("dropTables"))).rejects.toThrow("Unknown operation dropTables.");
  });
});
