import { describe, expect, it } from "vitest";
import { buildIcs, eventWindow, googleCalendarUrl } from "./calendar";

describe("eventWindow", () => {
  it("makes a 3-hour UTC window for a timed event", () => {
    expect(eventWindow({ date: "2026-12-04", time: "19:00" })).toEqual({
      allDay: false,
      start: "20261204T133000Z",
      end: "20261204T163000Z",
    });
  });
  it("makes an all-day entry when there is no time", () => {
    expect(eventWindow({ date: "2026-12-31" })).toEqual({ allDay: true, start: "20261231", end: "20270101" });
  });
  it("returns null for a bad date", () => {
    expect(eventWindow({ date: "31/12/2026" })).toBeNull();
  });
});

describe("googleCalendarUrl", () => {
  it("builds a Google Calendar template link", () => {
    const url = new URL(googleCalendarUrl({ title: "Sangeet — A & B", date: "2026-12-03", time: "19:30", location: "Jaipur" }));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Sangeet — A & B");
    expect(url.searchParams.get("dates")).toBe("20261203T140000Z/20261203T170000Z");
    expect(url.searchParams.get("location")).toBe("Jaipur");
  });
  it("returns null for a bad date", () => {
    expect(googleCalendarUrl({ title: "x", date: "bad" })).toBeNull();
  });
});

describe("buildIcs", () => {
  const now = new Date("2026-10-06T00:00:00Z");
  it("produces CRLF-separated VEVENTs with escaped text", () => {
    const ics = buildIcs([{ title: "Vivah", date: "2026-12-04", time: "19:00", location: "Riviera, Rishikesh", details: "A; B" }], { uidPrefix: "t", now });
    expect(ics.split("\r\n")).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Baba Saab Events//Invitations//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:t-0@babasaab",
      "DTSTAMP:20261006T000000Z",
      "DTSTART:20261204T133000Z",
      "DTEND:20261204T163000Z",
      "SUMMARY:Vivah",
      "LOCATION:Riviera\\, Rishikesh",
      "DESCRIPTION:A\\; B",
      "END:VEVENT",
      "END:VCALENDAR",
    ]);
  });
  it("skips entries with bad dates and writes all-day dates", () => {
    const ics = buildIcs([{ title: "Bad", date: "x" }, { title: "Haldi", date: "2026-12-03" }], { now });
    expect(ics).not.toContain("SUMMARY:Bad");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261203");
    expect(ics).toContain("DTEND;VALUE=DATE:20261204");
  });
});

describe("buildIcs UIDs", () => {
  it("uses each entry's own uid so calendar apps keep every event", () => {
    const now = new Date("2026-10-06T00:00:00Z");
    const one = buildIcs([{ uid: "inv1-haldi", title: "Haldi", date: "2026-12-03" }], { now });
    const two = buildIcs([{ uid: "inv1-mehendi", title: "Mehendi", date: "2026-12-03" }], { now });
    expect(one).toContain("UID:inv1-haldi@babasaab");
    expect(two).toContain("UID:inv1-mehendi@babasaab");
  });
});
