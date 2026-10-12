import { describe, expect, it } from "vitest";
import { slugify, textOf } from "./guideAnchors";

describe("slugify", () => {
  it("turns a heading into a URL-safe anchor", () => {
    expect(slugify("Editor step 1: Template & palette")).toBe("editor-step-1-template-palette");
    expect(slugify("Managing staff (owner only)")).toBe("managing-staff-owner-only");
  });
});

describe("textOf", () => {
  it("flattens React children to text", () => {
    expect(textOf(["Editor step ", 2, ": ", { props: { children: "Couple" } }])).toBe("Editor step 2: Couple");
  });
});
