import { describe, expect, it } from "vitest";
import { getIn, setIn } from "./paths";

describe("getIn", () => {
  it("reads nested values and tolerates gaps", () => {
    expect(getIn({ a: { b: [10, 20] } }, ["a", "b", 1])).toBe(20);
    expect(getIn({}, ["a", "b"])).toBeUndefined();
  });
});

describe("setIn", () => {
  it("sets a nested value without mutating the original", () => {
    const original = { couple: { bride: { name: { en: "Priya" } } } };
    const next = setIn(original, ["couple", "groom", "name"], { en: "Rahul" });
    expect(next.couple).toEqual({ bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } });
    expect(original.couple.groom).toBeUndefined();
    expect(next.couple.bride).toBe(original.couple.bride);
  });

  it("updates one array element", () => {
    const next = setIn({ events: [{ id: "a" }, { id: "b" }] }, ["events", 1, "time"], "19:30");
    expect(next.events).toEqual([{ id: "a" }, { id: "b", time: "19:30" }]);
    expect(Array.isArray(next.events)).toBe(true);
  });

  it("removes a key when the value is undefined", () => {
    expect(setIn({ venue: { mapsUrl: "x", name: { en: "R" } } }, ["venue", "mapsUrl"], undefined)).toEqual({ venue: { name: { en: "R" } } });
  });
});
