import { describe, expect, it } from "vitest";
import { familyMarks, familyNote, filterRows, nameKey, rsvpKeyFor, summarize, toCsv } from "./rsvpList";

const events = [
  { id: "a", name: { en: "Sangeet", hi: "संगीत" } },
  { id: "b", name: { en: "Wedding" } },
];

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

describe("summarize", () => {
  it("counts replies and people", () => {
    const rows = [
      { attending: "yes", guestCount: 3, eventIds: ["a"] },
      { attending: "yes", eventIds: [] },
      { attending: "maybe", guestCount: 2, eventIds: ["a"] },
      { attending: "no", guestCount: 1, eventIds: ["b"] },
    ];
    expect(summarize(rows, events)).toEqual({
      coming: 2, notComing: 1, maybe: 1, people: 4, perEvent: { a: 4, b: 1 },
    });
  });
});

describe("family marks", () => {
  const rows = [
    { rsvpKey: "919876543210#asha", phoneKey: "919876543210", name: "Asha" },
    { rsvpKey: "919876543210#ravi", phoneKey: "919876543210", name: "Ravi" },
    { rsvpKey: "919999999999#sam", phoneKey: "919999999999", name: "Sam" },
    { rsvpKey: "staff#1", phoneKey: "919876543210", name: "Staff Entry" },
  ];
  it("marks rows sharing a phone, ignoring staff rows", () => {
    const m = familyMarks(rows);
    expect(m.get("919876543210#asha")).toEqual(["Ravi"]);
    expect(m.get("919876543210#ravi")).toEqual(["Asha"]);
    expect(m.has("919999999999#sam")).toBe(false);
    expect(m.has("staff#1")).toBe(false);
  });
  it("skips rows without rsvpKey", () => {
    expect(familyMarks([{ phoneKey: "1", name: "X" }, { phoneKey: "1", name: "Y" }]).size).toBe(0);
  });
  it("note text", () => {
    expect(familyNote(["Asha", "Ravi"])).toBe("Same family as Asha, Ravi — replied from the same phone number");
  });
});

describe("filterRows", () => {
  const rows = [
    { name: "Asha", phone: "98765 43210", attending: "yes", eventIds: ["a"], updatedAt: "2026-01-01T00:00:00Z" },
    { name: "Ravi", phone: "+91 90000 11111", attending: "no", eventIds: ["b"], updatedAt: "2026-03-01T00:00:00Z" },
    { name: "Mina", phone: "90000 22222", attending: "yes", eventIds: [], updatedAt: "2026-02-01T00:00:00Z" },
  ];
  it("sorts newest first", () => {
    expect(filterRows(rows, {}).map((r) => r.name)).toEqual(["Ravi", "Mina", "Asha"]);
  });
  it("filters by q on name or phone digits", () => {
    expect(filterRows(rows, { q: "ash" }).map((r) => r.name)).toEqual(["Asha"]);
    expect(filterRows(rows, { q: "90000" }).map((r) => r.name)).toEqual(["Ravi", "Mina"]);
    expect(filterRows(rows, { q: "+91 98765" }).map((r) => r.name)).toEqual(["Asha"]);
    expect(filterRows(rows, { q: "98765" }).map((r) => r.name)).toEqual(["Asha"]);
  });
  it("filters by event, keeping all-events replies", () => {
    expect(filterRows(rows, { eventId: "a" }).map((r) => r.name)).toEqual(["Mina", "Asha"]);
  });
  it("filters by attending", () => {
    expect(filterRows(rows, { attending: "no" }).map((r) => r.name)).toEqual(["Ravi"]);
    expect(filterRows(rows, { attending: "all" })).toHaveLength(3);
  });
});

describe("toCsv", () => {
  const base = { phone: "98765 43210", attending: "yes", eventIds: ["a", "b"], updatedAt: "2026-10-24T17:00:00Z", source: "guest" };
  const body = (rows, lang = "both") => toCsv(rows, events, lang).slice(1);

  it("writes BOM, header, CRLF, quoting and Devanagari", () => {
    const rows = [
      { ...base, name: "प्रिया", guestCount: 2, meal: "veg", message: 'Hi, "all"\nbest' },
      { ...base, name: "Ravi", attending: "no", eventIds: [], updatedAt: "2026-01-02T00:00:00Z", source: "staff" },
    ];
    const csv = toCsv(rows, events, "both");
    expect(csv.startsWith(String.fromCharCode(0xfeff))).toBe(true);
    expect(csv.slice(1).startsWith("Name,Phone,Attending,People,Events,Meal,Message,Replied,Source\r\n")).toBe(true);
    expect(csv).toContain("प्रिया");
    expect(csv).toContain('"Hi, ""all""\nbest"');
    expect(csv).toContain("Sangeet; Wedding");
    expect(csv.slice(1).split("\r\n")).toHaveLength(4);
    expect(toCsv(rows, events, "hi")).toContain("संगीत; Wedding");
  });

  it("neutralises formula injection in every column", () => {
    const out = body([
      { ...base, name: '=HYPERLINK("http://x","y")', message: "@cmd", meal: "-1+1", source: "+x" },
      { ...base, name: "\tTab", message: "\rCR" },
    ]);
    expect(out).toContain(`"'=HYPERLINK(""http://x"",""y"")"`);
    expect(out).toContain(",'@cmd,");
    expect(out).toContain(",'-1+1,");
    expect(out).toContain(",'+x\r\n");
    expect(out).toContain("'\tTab");
    expect(out).toContain(`"'\rCR"`);
  });

  it("keeps the phone as text with a quote prefix", () => {
    expect(body([{ ...base, name: "A", phone: "+91 98765 43210" }])).toContain(",'+91 98765 43210,");
    expect(body([{ ...base, name: "A" }])).toContain(",'98765 43210,");
  });

  it("uses friendly attending labels, IST time and All events", () => {
    const rows = [{ ...base, name: "A", eventIds: [] }];
    const en = body(rows);
    expect(en).toContain("A,'98765 43210,Coming,1,All events,");
    expect(en).toContain("24 Oct 2026, 10:30 pm");
    const hi = body(rows, "hi");
    expect(hi).toContain("आ रहे हैं");
    expect(hi).toContain("सभी कार्यक्रम");
    expect(body([{ ...base, name: "B", attending: "no" }], "hi")).toContain("नहीं आ रहे");
    expect(body([{ ...base, name: "C", attending: "maybe" }], "hi")).toContain("शायद");
    expect(body([{ ...base, name: "B", attending: "no" }])).toContain("Not coming");
  });

  it("leaves People blank for no and maybe", () => {
    expect(body([{ ...base, name: "B", attending: "no", guestCount: 3 }])).toContain("Not coming,,");
    expect(body([{ ...base, name: "M", attending: "maybe", guestCount: 3 }])).toContain("Maybe,,");
  });
});
