import { describe, expect, it } from "vitest";
import { errorMessage, formatAddedDate, statusLabel } from "./format";

describe("statusLabel", () => {
  it("describes each account status in plain words", () => {
    expect(statusLabel("invited")).toBe("Invited · hasn't signed in yet");
    expect(statusLabel("active")).toBe("Active");
    expect(statusLabel("disabled")).toBe("Disabled");
  });
});

describe("formatAddedDate", () => {
  it("shows the day in India time", () => {
    expect(formatAddedDate("2026-10-01T10:00:00.000Z")).toBe("1 Oct 2026");
    // 20:00 UTC on 1 Oct is already 2 Oct in India.
    expect(formatAddedDate("2026-10-01T20:00:00.000Z")).toBe("2 Oct 2026");
  });
});

describe("errorMessage", () => {
  it("uses the message the backend wrote for staff", () => {
    expect(errorMessage([{ message: "neha@example.com already has a staff account.", errorType: "Lambda:Unhandled" }])).toBe(
      "neha@example.com already has a staff account.",
    );
  });

  it("explains authorisation failures", () => {
    expect(errorMessage([{ message: "Not Authorized to access listStaff on type Query", errorType: "Unauthorized" }])).toBe(
      "Only the owner can manage staff.",
    );
  });

  it("hides AppSync and runtime errors that staff can't act on", () => {
    expect(errorMessage([{ message: "Task timed out after 15.00 seconds", errorType: "Lambda:Timeout" }])).toBe(
      "Something went wrong. Please try again.",
    );
    expect(errorMessage([{ message: "Variable 'username' has coerced Null value", errorType: "BadRequestException" }])).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("falls back to a generic message", () => {
    expect(errorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(errorMessage([{}])).toBe("Something went wrong. Please try again.");
  });
});
