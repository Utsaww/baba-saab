import { describe, expect, it } from "vitest";
import { indexFields } from "./indexFields";

describe("indexFields", () => {
  it("builds the list label and search text", () => {
    const fields = indexFields({
      templateId: "floral",
      mainDate: "2027-02-14",
      couple: { bride: { name: { en: "Priya ", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
      hosts: { contactPhone: "+91 98765-43210" },
    });
    expect(fields).toEqual({
      templateId: "floral",
      mainDate: "2027-02-14",
      coupleNames: "Priya & Rahul",
      searchText: "priya प्रिया rahul राहुल 919876543210",
    });
  });

  it("uses Hindi names when there is no English", () => {
    const fields = indexFields({ templateId: "royal", couple: { bride: { name: { hi: "प्रिया" } } } });
    expect(fields.coupleNames).toBe("प्रिया");
  });

  it("labels an invitation with no names yet", () => {
    expect(indexFields({ templateId: "royal" })).toEqual({
      templateId: "royal",
      mainDate: null,
      coupleNames: "Untitled invitation",
      searchText: "",
    });
  });
});
