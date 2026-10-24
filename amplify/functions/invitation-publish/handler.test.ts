import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./publish", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./publish")>();
  return {
    ...actual,
    regenerateFamilyToken: vi.fn(async () => ({ familyToken: "t" })),
    markRsvpsSeen: vi.fn(async () => ({ ok: true })),
  };
});

import { handler } from "./handler";
import { markRsvpsSeen, regenerateFamilyToken } from "./publish";

const event = (fieldName: string, groups: string[] | null = ["admin"]) => ({
  fieldName,
  arguments: { id: "inv-1" },
  identity: groups ? { groups } : null,
});

describe("invitation-publish handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes regenerateFamilyToken and markRsvpsSeen for staff", async () => {
    await expect(handler(event("regenerateFamilyToken"))).resolves.toEqual({ familyToken: "t" });
    expect(regenerateFamilyToken).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: "inv-1" });
    await expect(handler(event("markRsvpsSeen"))).resolves.toEqual({ ok: true });
    expect(markRsvpsSeen).toHaveBeenCalledWith(expect.anything(), expect.anything(), { id: "inv-1" });
  });
  it.each([[null], [[]], [["owner"]]])("refuses a non-staff caller %j", async (groups) => {
    await expect(handler(event("regenerateFamilyToken", groups))).rejects.toMatchObject({ name: "Forbidden" });
    await expect(handler(event("markRsvpsSeen", groups))).rejects.toMatchObject({ name: "Forbidden" });
    expect(regenerateFamilyToken).not.toHaveBeenCalled();
    expect(markRsvpsSeen).not.toHaveBeenCalled();
  });
});
