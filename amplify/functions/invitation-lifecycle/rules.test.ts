import { describe, expect, it } from "vitest";
import { addDays, asContent, defaultOfflineOn, isEraseDue, isIsoDate, isOfflineDue, PURGE_DAYS, todayIST } from "./rules";

// Same cases as src/InvitationModule/lib/lifecycle.test.js: the two copies must agree.
const at = (iso: string) => Date.parse(iso);

describe("todayIST", () => {
  it("is already tomorrow at 00:30 IST while UTC is still today", () => {
    expect(todayIST(at("2027-02-13T19:00:00Z"))).toBe("2027-02-14");
    expect(todayIST(at("2027-02-13T18:00:00Z"))).toBe("2027-02-13");
  });
});

describe("addDays", () => {
  it("crosses months and years", () => {
    expect(addDays("2027-02-25", 7)).toBe("2027-03-04");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("defaultOfflineOn", () => {
  it("is the latest event date + 7", () => {
    const content = { mainDate: "2027-02-14", events: [{ date: "2027-02-12" }, { date: "2027-02-15" }, { date: "" }] };
    expect(defaultOfflineOn(content)).toBe("2027-02-22");
  });
  it("falls back to the wedding date", () => {
    expect(defaultOfflineOn({ mainDate: "2027-02-14", events: [] })).toBe("2027-02-21");
  });
  it("is null without any date", () => expect(defaultOfflineOn({})).toBeNull());
  it("is null for missing content", () => expect(defaultOfflineOn(null)).toBeNull());
});

describe("asContent", () => {
  it("reads AWSJSON stored as an object, a string or a double-encoded string", () => {
    const content = { mainDate: "2027-02-14" };
    expect(asContent(content)).toEqual(content);
    expect(asContent(JSON.stringify(content))).toEqual(content);
    expect(asContent(JSON.stringify(JSON.stringify(content)))).toEqual(content);
  });
  it("is null for anything that isn't an object", () => {
    for (const v of [undefined, null, "", "not json", "[1]", "3", 3, [1]]) expect(asContent(v)).toBeNull();
  });
});

describe("isOfflineDue", () => {
  const now = at("2027-02-22T00:00:00Z"); // 05:30 IST on 22 Feb
  it("is due on the day itself and after", () => {
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-22" }, now)).toBe(true);
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-21" }, now)).toBe(true);
  });
  it("is not due before, without a date, or when not published", () => {
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-23" }, now)).toBe(false);
    expect(isOfflineDue({ status: "published", offlineOn: null }, now)).toBe(false);
    expect(isOfflineDue({ status: "draft", offlineOn: "2027-01-01" }, now)).toBe(false);
  });
});

describe("isEraseDue", () => {
  const now = at("2027-03-30T10:00:00Z");
  it("is due for offline or deleted rows past purgeAt", () => {
    expect(isEraseDue({ status: "offline", purgeAt: "2027-03-30T09:59:59Z" }, now)).toBe(true);
    expect(isEraseDue({ status: "deleted", purgeAt: "2027-03-30T10:00:00Z" }, now)).toBe(true);
  });
  it("is never due for live or draft rows, or before purgeAt", () => {
    expect(isEraseDue({ status: "published", purgeAt: "2027-01-01T00:00:00Z" }, now)).toBe(false);
    expect(isEraseDue({ status: "offline", purgeAt: "2027-03-31T00:00:00Z" }, now)).toBe(false);
    expect(isEraseDue({ status: "offline", purgeAt: null }, now)).toBe(false);
  });
  it("uses a 30-day window", () => expect(PURGE_DAYS).toBe(30));
});

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2027-02-28")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    for (const d of ["2027-02-29", "2027-02-31", "2027-02-30", "2027-13-01", "2027-00-10", "2027-2-3", "27-02-03", "2027-02-03Z", "", null, undefined, 20270203]) {
      expect(isIsoDate(d)).toBe(false);
    }
  });
  it("makes an impossible date never due", () => {
    expect(isOfflineDue({ status: "published", offlineOn: "2027-02-31" }, at("2027-04-01T00:00:00Z"))).toBe(false);
  });
});
