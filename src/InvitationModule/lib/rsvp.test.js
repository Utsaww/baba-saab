import { describe, expect, it } from "vitest";
import { isRsvpClosed, validateRsvpInput } from "./rsvp";

describe("isRsvpClosed", () => {
  const rsvp = { enabled: true, deadline: "2026-10-31" };
  it("stays open until the end of the deadline day in IST", () => {
    expect(isRsvpClosed(rsvp, Date.parse("2026-10-31T18:29:59Z"))).toBe(false);
  });
  it("closes once the deadline day ends in IST", () => {
    expect(isRsvpClosed(rsvp, Date.parse("2026-10-31T18:30:00Z"))).toBe(true);
  });
  it("is never closed without a deadline", () => {
    expect(isRsvpClosed({ enabled: true }, Date.parse("2099-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("validateRsvpInput", () => {
  const ok = { name: "Sharma Parivar", phone: "+91 98765 43210", attending: "yes", guestCount: "3" };
  it("accepts a complete response", () => {
    expect(validateRsvpInput(ok, { askGuestCount: true })).toEqual({});
  });
  it("flags missing name, bad phone and missing attendance", () => {
    expect(validateRsvpInput({ name: " ", phone: "123", attending: "" }, { askGuestCount: false })).toEqual({
      name: "required",
      phone: "phone",
      attending: "required",
    });
  });
  it("checks guest count only when asked and attending", () => {
    expect(validateRsvpInput({ ...ok, guestCount: "0" }, { askGuestCount: true })).toEqual({ guestCount: "count" });
    expect(validateRsvpInput({ ...ok, guestCount: "21" }, { askGuestCount: true })).toEqual({ guestCount: "count" });
    expect(validateRsvpInput({ ...ok, attending: "no", guestCount: "0" }, { askGuestCount: true })).toEqual({});
    expect(validateRsvpInput({ ...ok, guestCount: "0" }, { askGuestCount: false })).toEqual({});
  });
});
