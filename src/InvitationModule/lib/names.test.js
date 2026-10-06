import { describe, expect, it } from "vitest";
import { coupleTitle, monogram } from "./names";
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
});
