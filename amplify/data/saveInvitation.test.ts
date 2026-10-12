import { describe, expect, it, vi } from "vitest";

vi.mock("@aws-appsync/utils", () => ({
  util: {
    time: { nowISO8601: () => "2026-10-08T10:00:00.000Z" },
    error: (message: string, type: string) => {
      throw Object.assign(new Error(message), { type });
    },
  },
}));

vi.mock("@aws-appsync/utils/dynamodb", () => ({
  update: (input: unknown) => ({ operation: "UpdateItem", input }),
  operations: { increment: (by: number) => ({ increment: by }) },
}));

import { request, response } from "./saveInvitation.js";

const args = {
  id: "inv-1",
  expectedVersion: 3,
  content: '{"templateId":"royal"}',
  templateId: "royal",
  coupleNames: "Priya & Rahul",
  searchText: "priya rahul",
  updatedBy: "staff@example.com",
};

describe("saveInvitation request", () => {
  it("updates only if the stored version still matches, and bumps it", () => {
    const req = request({ args } as any) as any;
    expect(req.input.key).toEqual({ id: "inv-1" });
    expect(req.input.condition).toEqual({ version: { eq: 3 } });
    expect(req.input.update).toEqual({
      content: '{"templateId":"royal"}',
      templateId: "royal",
      mainDate: null,
      coupleNames: "Priya & Rahul",
      searchText: "priya rahul",
      updatedBy: "staff@example.com",
      updatedAt: "2026-10-08T10:00:00.000Z",
      version: { increment: 1 },
    });
  });

  it("stores the wedding date when given", () => {
    const req = request({ args: { ...args, mainDate: "2027-02-14" } } as any) as any;
    expect(req.input.update.mainDate).toBe("2027-02-14");
  });
});

describe("saveInvitation response", () => {
  it("returns the updated invitation", () => {
    expect(response({ result: { id: "inv-1", version: 4 } } as any)).toEqual({ id: "inv-1", version: 4 });
  });

  it("turns a failed version check into a VersionConflict error", () => {
    expect(() => response({ error: { type: "DynamoDB:ConditionalCheckFailedException", message: "x" } } as any)).toThrow(
      expect.objectContaining({ message: "Updated by someone else — reload", type: "VersionConflict" }),
    );
  });

  it("passes other errors through", () => {
    expect(() =>
      response({ error: { type: "DynamoDB:ProvisionedThroughputExceededException", message: "slow down" } } as any),
    ).toThrow(expect.objectContaining({ message: "slow down", type: "DynamoDB:ProvisionedThroughputExceededException" }));
  });
});
