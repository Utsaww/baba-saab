import { describe, expect, it } from "vitest";
import { coupleTitle, couplePair, isGroomFirst, monogram } from "./names";
import { parseInvitation } from "../schema/invitation";
import { minimalInvitation } from "../testing/fixtures";

describe("names", () => {
  it("builds the couple title and monogram", () => {
    const inv = parseInvitation(minimalInvitation());
    expect(coupleTitle(inv)).toBe("Akriti & Ankit");
    expect(monogram(inv)).toBe("A&A");
  });
  it("uses Hindi names when English is missing", () => {
    const input = minimalInvitation();
    input.couple.bride.name = { hi: "मीरा" };
    input.couple.groom.name = { hi: "अर्जुन" };
    const inv = parseInvitation(input);
    expect(coupleTitle(inv, "hi")).toBe("मीरा & अर्जुन");
    expect(monogram(inv)).toBe("म&अ");
  });

  describe("couple order", () => {
    const withOrder = (order) => {
      const input = minimalInvitation();
      if (order) input.couple.order = order;
      return parseInvitation(input);
    };
    it("names the bride first when no order is set", () => {
      const inv = withOrder(undefined);
      expect(isGroomFirst(inv)).toBe(false);
      expect(couplePair(inv).map((p) => p.name.en)).toEqual(["Akriti", "Ankit"]);
    });
    it("names the bride first for bride-first", () => {
      const inv = withOrder("bride-first");
      expect(couplePair(inv).map((p) => p.name.en)).toEqual(["Akriti", "Ankit"]);
      expect(coupleTitle(inv)).toBe("Akriti & Ankit");
      expect(monogram(inv)).toBe("A&A");
    });
    it("names the groom first for groom-first", () => {
      const input = minimalInvitation();
      input.couple.groom.name = { en: "Rohan" };
      input.couple.order = "groom-first";
      const inv = parseInvitation(input);
      expect(isGroomFirst(inv)).toBe(true);
      expect(couplePair(inv).map((p) => p.name.en)).toEqual(["Rohan", "Akriti"]);
      expect(coupleTitle(inv)).toBe("Rohan & Akriti");
      expect(monogram(inv)).toBe("R&A");
    });
  });
});
