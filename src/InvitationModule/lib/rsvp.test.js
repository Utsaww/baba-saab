import { describe, expect, it } from "vitest";
import { isRsvpClosed, rsvpMessage, validateRsvpInput, whatsappDigits, whatsappRsvpUrl } from "./rsvp";

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

const inv = {
  couple: { bride: { name: { en: "Meera", hi: "मीरा" } }, groom: { name: { en: "Arjun", hi: "अर्जुन" } } },
  hosts: { contactPhone: "+91 98765 43210" },
  events: [
    { id: "sangeet", name: { en: "Sangeet", hi: "संगीत" } },
    { id: "wedding", name: { en: "Wedding", hi: "विवाह" } },
  ],
};
const reply = {
  name: "Sharma Parivar",
  phone: "9812345678",
  attending: "yes",
  guestCount: 3,
  eventIds: ["sangeet", "wedding"],
  meal: "veg",
  message: "Congratulations!",
};

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

describe("rsvpMessage", () => {
  it("lists the reply in English, one line each", () => {
    expect(rsvpMessage(inv, reply, "en")).toBe(
      [
        "RSVP — Meera & Arjun",
        "Name: Sharma Parivar",
        "Attending: Joyfully accept",
        "Guests: 3",
        "Events: Sangeet, Wedding",
        "Meal: Vegetarian",
        "Phone: 9812345678",
        "Message: Congratulations!",
      ].join("\n"),
    );
  });
  it("leaves out lines with nothing in them", () => {
    const declined = { name: "Gupta Ji", phone: "9812345678", attending: "no", eventIds: [] };
    expect(rsvpMessage(inv, declined, "en")).toBe(
      ["RSVP — Meera & Arjun", "Name: Gupta Ji", "Attending: Regretfully decline", "Phone: 9812345678"].join("\n"),
    );
  });
  it("uses Hindi labels and names for a Hindi invitation", () => {
    const text = rsvpMessage(inv, reply, "hi");
    expect(text.split("\n")[0]).toBe("उपस्थिति की पुष्टि — मीरा & अर्जुन");
    expect(text).toContain("नाम: Sharma Parivar");
    expect(text).toContain("उपस्थिति: सहर्ष स्वीकार");
    expect(text).toContain("कार्यक्रम: संगीत, विवाह");
    expect(text).toContain("भोजन: शाकाहारी");
  });
  it("uses English labels for a bilingual invitation", () => {
    expect(rsvpMessage(inv, reply, "both").split("\n")[0]).toBe("RSVP — Meera & Arjun");
  });
});

describe("whatsappRsvpUrl", () => {
  it("opens a chat with the family's number and the message, encoded", () => {
    const url = whatsappRsvpUrl(inv, reply, "en");
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(rsvpMessage(inv, reply, "en"));
    expect(url).not.toMatch(/[ \n&]Name/);
  });
  it("gives null without a family number", () => {
    expect(whatsappRsvpUrl({ ...inv, hosts: {} }, reply, "en")).toBeNull();
  });
});
