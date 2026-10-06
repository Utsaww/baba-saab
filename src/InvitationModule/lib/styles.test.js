import { describe, expect, it } from "vitest";
import { mergeStyles } from "./styles";

describe("mergeStyles", () => {
  it("joins class names for keys present in any module", () => {
    expect(mergeStyles({ root: "a", cover: "b" }, { root: "c", flap: "d" }, undefined)).toEqual({ root: "a c", cover: "b", flap: "d" });
  });
});
