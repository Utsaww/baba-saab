import { describe, expect, it } from "vitest";
import { filterInvitations, formatEdited, sortByRecent } from "./listing";

const rows = [
  { id: "a", status: "draft", searchText: "priya प्रिया rahul 919876543210", updatedAt: "2026-10-08T09:00:00.000Z" },
  { id: "b", status: "draft", searchText: "neha arjun", updatedAt: "2026-10-08T11:00:00.000Z" },
  { id: "c", status: "published", searchText: "aarohi vihaan", updatedAt: "2026-10-07T11:00:00.000Z" },
];

describe("filterInvitations", () => {
  it("returns everything with no search or filter", () => {
    expect(filterInvitations(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("matches every search word, in either language, ignoring case", () => {
    expect(filterInvitations(rows, { q: "PRIYA rahul" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterInvitations(rows, { q: "प्रिया" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterInvitations(rows, { q: "priya neha" })).toEqual([]);
  });

  it("matches phone numbers however they are typed", () => {
    expect(filterInvitations(rows, { q: "98765 43210" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterInvitations(rows, { q: "+91-98765" }).map((r) => r.id)).toEqual(["a"]);
  });

  it("filters by status", () => {
    expect(filterInvitations(rows, { status: "published" }).map((r) => r.id)).toEqual(["c"]);
  });
});

describe("sortByRecent", () => {
  it("puts the most recently edited first without mutating the input", () => {
    expect(sortByRecent(rows).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(rows[0].id).toBe("a");
  });
});

describe("formatEdited", () => {
  const now = Date.parse("2026-10-08T12:00:00.000Z");

  it("describes recent edits relatively", () => {
    expect(formatEdited("2026-10-08T11:59:40.000Z", now)).toBe("just now");
    expect(formatEdited("2026-10-08T11:45:00.000Z", now)).toBe("15 min ago");
    expect(formatEdited("2026-10-08T09:00:00.000Z", now)).toBe("3 h ago");
    expect(formatEdited("2026-10-05T12:00:00.000Z", now)).toBe("3 days ago");
  });

  it("shows older edits as a date in India time", () => {
    const expected = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date("2026-09-20T20:00:00.000Z"));
    expect(expected).toMatch(/^21 Sep/);
    expect(formatEdited("2026-09-20T20:00:00.000Z", now)).toBe(expected);
  });
});
