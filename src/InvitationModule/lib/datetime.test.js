import { describe, expect, it } from "vitest";
import { dateParts, dateRangeParts, endDateError, formatDateRange, validEndDate, formatDate, formatDots, formatTime, istInstant } from "./datetime";

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

describe("dateRangeParts", () => {
  it("shows a single day when there is no end date", () => {
    expect(dateRangeParts("2026-12-11", undefined, "en")).toEqual({ month: "Dec", date: "11", year: "2026" });
  });
  it("joins days within a month", () => {
    expect(dateRangeParts("2026-12-11", "2026-12-12", "en")).toEqual({ month: "Dec", date: "11–12", year: "2026" });
  });
  it("joins months and days across months", () => {
    expect(dateRangeParts("2026-11-30", "2026-12-01", "en")).toEqual({ month: "Nov–Dec", date: "30–1", year: "2026" });
  });
  it("joins years across years", () => {
    expect(dateRangeParts("2026-12-31", "2027-01-01", "en")).toEqual({ month: "Dec–Jan", date: "31–1", year: "2026–27" });
  });
  it("uses full Hindi month names and Latin digits", () => {
    expect(dateRangeParts("2026-12-11", "2026-12-12", "hi")).toEqual({ month: "दिसंबर", date: "11–12", year: "2026" });
    expect(dateRangeParts("2026-11-30", "2026-12-01", "hi")).toEqual({ month: "नवंबर–दिसंबर", date: "30–1", year: "2026" });
    expect(dateRangeParts("2026-12-31", "2027-01-01", "hi")).toEqual({ month: "दिसंबर–जनवरी", date: "31–1", year: "2026–27" });
  });
  it("ignores an invalid end date", () => {
    for (const end of ["2026-12-11", "2026-12-19", "2026-12-10"]) expect(dateRangeParts("2026-12-11", end, "en").date).toBe("11");
  });
  it("returns null without a start date", () => {
    expect(dateRangeParts(undefined, "2026-12-12", "en")).toBeNull();
  });
});

describe("validEndDate and endDateError", () => {
  it("accepts 1 to 7 days after the start", () => {
    expect(validEndDate("2026-12-11", "2026-12-12")).toBe(true);
    expect(validEndDate("2026-12-11", "2026-12-18")).toBe(true);
    expect(endDateError("2026-12-11", "2026-12-12")).toBeUndefined();
  });
  it("rejects the same day, earlier days and more than 7 days", () => {
    for (const end of ["2026-12-11", "2026-12-10", "2026-12-19"]) {
      expect(validEndDate("2026-12-11", end)).toBe(false);
      expect(endDateError("2026-12-11", end)).toBe("Pick a date 1–7 days after the wedding date");
    }
  });
  it("is not an error when the end date is absent", () => {
    expect(endDateError("2026-12-11", undefined)).toBeUndefined();
    expect(validEndDate(undefined, "2026-12-12")).toBe(false);
  });
});

describe("formatDateRange", () => {
  it("reads like a sentence within one month", () => {
    expect(formatDateRange("2026-12-11", "2026-12-12", "en")).toBe("Friday 11 – Saturday 12 December 2026");
    expect(formatDateRange("2026-12-11", "2026-12-12", "hi")).toBe("शुक्रवार 11 – शनिवार 12 दिसंबर 2026");
  });
  it("names both months across months", () => {
    expect(formatDateRange("2026-11-30", "2026-12-01", "en")).toBe("Monday 30 November – Tuesday 1 December 2026");
  });
  it("names both years across years", () => {
    expect(formatDateRange("2026-12-31", "2027-01-01", "en")).toBe("Thursday 31 December 2026 – Friday 1 January 2027");
    expect(formatDateRange("2026-12-31", "2027-01-01", "hi")).toBe("गुरुवार 31 दिसंबर 2026 – शुक्रवार 1 जनवरी 2027");
  });
  it("falls back to the single date for a missing or invalid end", () => {
    expect(formatDateRange("2026-12-11", undefined, "en")).toBe(formatDate("2026-12-11", "en"));
    expect(formatDateRange("2026-12-11", "2026-12-30", "en")).toBe(formatDate("2026-12-11", "en"));
  });
});
