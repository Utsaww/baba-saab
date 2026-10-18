import { describe, expect, it } from "vitest";
import { dateParts, formatDate, formatDots, formatTime, istInstant } from "./datetime";

describe("dateParts", () => {
  it("splits a date into a short month, the day and the year in English", () => {
    expect(dateParts("2027-11-27", "en")).toEqual({ month: "Nov", day: "27", year: "2027" });
    expect(dateParts("2026-03-04", "en")).toEqual({ month: "Mar", day: "4", year: "2026" });
  });
  it("names the month in Hindi, keeping the digits", () => {
    expect(dateParts("2027-11-27", "hi")).toEqual({ month: "नवंबर", day: "27", year: "2027" });
    expect(dateParts("2027-02-14", "hi").month).toBe("फ़रवरी");
  });
  it("uses English for anything but Hindi", () => {
    expect(dateParts("2027-11-27", "both").month).toBe("Nov");
  });
  it("returns null for a missing or bad date", () => {
    expect(dateParts(undefined, "en")).toBeNull();
    expect(dateParts("27-11-2027", "en")).toBeNull();
  });
});

describe("istInstant", () => {
  it("interprets date and time as IST", () => {
    expect(istInstant("2026-12-04", "19:00").toISOString()).toBe("2026-12-04T13:30:00.000Z");
    expect(istInstant("2026-12-04").toISOString()).toBe("2026-12-03T18:30:00.000Z");
  });
  it("returns an invalid date for bad input", () => {
    expect(Number.isNaN(istInstant("04-12-2026").getTime())).toBe(true);
    expect(Number.isNaN(istInstant(undefined).getTime())).toBe(true);
  });
});

describe("formatDate", () => {
  it("formats in English and Hindi", () => {
    expect(formatDate("2026-12-04", "en")).toMatch(/Friday.*4 December 2026/);
    expect(formatDate("2026-12-04", "hi")).toMatch(/दिसंबर/);
  });
  it("returns an empty string for bad input", () => {
    expect(formatDate("not-a-date", "en")).toBe("");
  });
});

describe("formatTime", () => {
  it("formats 24-hour input as 12-hour", () => {
    expect(formatTime("19:00", "en")).toMatch(/^7:00\spm$/i);
  });
  it("returns an empty string for missing or invalid time", () => {
    expect(formatTime(undefined, "en")).toBe("");
    expect(formatTime("25:00", "en")).toBe("");
  });
});

describe("formatDots", () => {
  it("formats as DD · MM · YYYY", () => {
    expect(formatDots("2026-12-04")).toBe("04 · 12 · 2026");
    expect(formatDots("bad")).toBe("");
  });
});
