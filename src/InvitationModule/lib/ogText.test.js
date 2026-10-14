import { describe, expect, it } from "vitest";
import { ogDescription, ogTitle } from "./ogText";

const inv = (language) => ({
  language,
  couple: { bride: { name: { en: "Priya", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
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

describe("ogDescription", () => {
  it("joins the long date and venue", () => {
    expect(ogDescription(inv("en"))).toBe("Sunday, 14 February 2027 · Rambagh Palace");
  });
  it("omits a missing venue", () => {
    expect(ogDescription({ ...inv("en"), venue: { name: {} } })).toBe("Sunday, 14 February 2027");
  });
});
