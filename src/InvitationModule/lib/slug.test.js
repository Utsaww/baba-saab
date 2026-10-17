import { describe, expect, it } from "vitest";
import { generateSlug, randomSuffix, RESERVED_SLUGS, slugify, validateSlug } from "./slug";

const content = (bride, groom) => ({ couple: { bride: { name: bride }, groom: { name: groom } } });
const fixed = (n) => "k3f9pq".slice(0, n);

describe("slugify", () => {
  it("lower-cases, strips accents and joins words with single dashes", () => {
    expect(slugify("  Zoë  Ánne ")).toBe("zoe-anne");
    expect(slugify("Rahul_Kumar!!")).toBe("rahul-kumar");
  });
  it("drops non-latin letters", () => {
    expect(slugify("प्रिया")).toBe("");
  });
});

describe("generateSlug", () => {
  it("uses English names with a 4-char suffix", () => {
    expect(generateSlug(content({ en: "Priya" }, { en: "Rahul" }), fixed)).toBe("priya-weds-rahul-k3f9");
  });
  it("puts the groom first when groom-first", () => {
    const c = content({ en: "Priya" }, { en: "Rahul" });
    c.couple.order = "groom-first";
    expect(generateSlug(c, fixed)).toBe("rahul-weds-priya-k3f9");
  });
  it("falls back to invitation-<6> when an English name is missing", () => {
    expect(generateSlug(content({ hi: "प्रिया" }, { en: "Rahul" }), fixed)).toBe("invitation-k3f9pq");
  });
  it("keeps the result within 60 chars", () => {
    const long = "a".repeat(50);
    const slug = generateSlug(content({ en: long }, { en: long }), fixed);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(validateSlug(slug)).toBeNull();
  });
});

describe("randomSuffix", () => {
  it("uses only the unambiguous alphabet", () => {
    const s = randomSuffix(200);
    expect(s).toHaveLength(200);
    expect(s).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]+$/);
  });
});

describe("validateSlug", () => {
  it.each(["priya-weds-rahul", "abc", "a1-b2"])("accepts %s", (s) => expect(validateSlug(s)).toBeNull());
  it.each([
    ["ab", "Use 3 to 60 characters."],
    ["a".repeat(61), "Use 3 to 60 characters."],
    ["Priya", "Use only lowercase letters, numbers and dashes."],
    ["priya_rahul", "Use only lowercase letters, numbers and dashes."],
    ["-priya", "Don't start or end with a dash, or use two dashes together."],
    ["priya-", "Don't start or end with a dash, or use two dashes together."],
    ["priya--rahul", "Don't start or end with a dash, or use two dashes together."],
  ])("rejects %s", (s, message) => expect(validateSlug(s)).toBe(message));
  it("rejects reserved names", () => {
    for (const s of RESERVED_SLUGS) expect(validateSlug(s)).toBe("That link name is reserved — choose another.");
  });
  it("rejects non-strings", () => expect(validateSlug(undefined)).toBe("Use 3 to 60 characters."));
});
