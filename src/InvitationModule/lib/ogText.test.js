import { describe, expect, it } from "vitest";
import { ogDescription, ogTitle } from "./ogText";

const inv = (language, order) => ({
  language,
  couple: { order, bride: { name: { en: "Priya", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Rambagh Palace", hi: "रामबाग पैलेस" } },
});

describe("ogTitle", () => {
  it("is English for en and both", () => {
    expect(ogTitle(inv("en"))).toBe("Priya & Rahul are getting married");
    expect(ogTitle(inv("both"))).toBe("Priya & Rahul are getting married");
  });
  it("is Hindi for hi", () => expect(ogTitle(inv("hi"))).toBe("प्रिया और राहुल का शुभ विवाह"));
});

describe("ogTitle groom-first", () => {
  it("puts the groom first in English", () => expect(ogTitle(inv("en", "groom-first"))).toBe("Rahul & Priya are getting married"));
  it("puts the groom first in Hindi", () => expect(ogTitle(inv("hi", "groom-first"))).toBe("राहुल और प्रिया का शुभ विवाह"));
  it("keeps bride first for bride-first", () => expect(ogTitle(inv("en", "bride-first"))).toBe("Priya & Rahul are getting married"));
});

describe("ogDescription", () => {
  it("joins the long date and venue", () => {
    expect(ogDescription(inv("en"))).toBe("Sunday, 14 February 2027 · Rambagh Palace");
  });
  it("omits a missing venue", () => {
    expect(ogDescription({ ...inv("en"), venue: { name: {} } })).toBe("Sunday, 14 February 2027");
  });
});
