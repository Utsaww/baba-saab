import { describe, expect, it } from "vitest";
import { isRsvpClosed, isWhatsappNumber, nameKey, rsvpKeyFor, validateRsvpInput, whatsappDigits, whatsappRsvpOn } from "./keys";

// Same cases as src/InvitationModule/lib/rsvpList.test.js ("keys") and src/InvitationModule/lib/rsvp.test.js.
describe("keys", () => {
  it("normalises name and phone", () => {
    expect(nameKey("  Rahul   Sharma ")).toBe("rahul sharma");
    const x = rsvpKeyFor({ phone: "+91 98765 43210", name: " Rahul  Sharma" });
    expect(x).toEqual(rsvpKeyFor({ phone: "9876543210", name: "rahul sharma" }));
    expect(x.rsvpKey).toBe("919876543210#rahul sharma");
  });
  it("same phone, different name differs only in rsvpKey", () => {
    const a = rsvpKeyFor({ phone: "9876543210", name: "Asha" });
    const b = rsvpKeyFor({ phone: "9876543210", name: "Ravi" });
    expect(a.phoneKey).toBe(b.phoneKey);
    expect(a.rsvpKey).not.toBe(b.rsvpKey);
  });
});

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

describe("whatsappDigits", () => {
  it("keeps digits only and adds India's 91 to a 10-digit number", () => {
    expect(whatsappDigits("+91 98765 43210")).toBe("919876543210");
    expect(whatsappDigits("98765-43210")).toBe("919876543210");
    expect(whatsappDigits("098765 43210")).toBe("919876543210");
    expect(whatsappDigits("+44 20 7946 0958")).toBe("442079460958");
  });
  it("gives an empty string when there is no number", () => {
    expect(whatsappDigits(undefined)).toBe("");
    expect(whatsappDigits("  ")).toBe("");
  });
});

describe("isWhatsappNumber", () => {
  it("accepts numbers that normalise to 11-15 digits", () => {
    expect(isWhatsappNumber("+91 98765 43210")).toBe(true);
    expect(isWhatsappNumber("98765 43210")).toBe(true);
    expect(isWhatsappNumber("(+91) 98765-43210")).toBe(true);
    expect(isWhatsappNumber("0044 20 7946 0958")).toBe(true);
    expect(isWhatsappNumber("+1 415 555 2671")).toBe(true);
  });
  it("rejects short, long, lettered and empty numbers", () => {
    expect(isWhatsappNumber("12345")).toBe(false);
    expect(isWhatsappNumber("98765 4321")).toBe(false);
    expect(isWhatsappNumber("+91 98765 43210 1234")).toBe(false);
    expect(isWhatsappNumber("98765abc10")).toBe(false);
    expect(isWhatsappNumber("   ")).toBe(false);
    expect(isWhatsappNumber(undefined)).toBe(false);
  });
  it("shares its normalising with whatsappDigits", () => {
    expect(whatsappDigits("0044 20 7946 0958")).toBe("442079460958");
    expect(whatsappDigits("(+91) 98765-43210")).toBe("919876543210");
  });
});

describe("whatsappRsvpOn", () => {
  it("is on only when staff opted in to WhatsApp replies", () => {
    expect(whatsappRsvpOn({ enabled: true, channel: "whatsapp" })).toBe(true);
    expect(whatsappRsvpOn({ enabled: true })).toBe(false);
    expect(whatsappRsvpOn({ enabled: false, channel: "whatsapp" })).toBe(false);
    expect(whatsappRsvpOn(undefined)).toBe(false);
  });
});
