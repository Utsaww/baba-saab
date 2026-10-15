import { describe, expect, it } from "vitest";
import {
  addDays, defaultOfflineOn, isEraseDue, isOfflineDue, listNotices, PURGE_DAYS, STATUS_LABEL, statusBadge, todayIST,
} from "./lifecycle";

const at = (iso) => Date.parse(iso);

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

describe("statusBadge", () => {
  it("labels every state", () => {
    expect(statusBadge({ status: "draft" })).toBe("draft");
    expect(statusBadge({ status: "published", version: 3, liveVersion: 3 })).toBe("live");
    expect(statusBadge({ status: "published", version: 4, liveVersion: 3 })).toBe("changes");
    expect(statusBadge({ status: "offline" })).toBe("offline");
    expect(statusBadge({ status: "deleted" })).toBe("deleted");
    expect(STATUS_LABEL).toEqual({ draft: "Draft", live: "Live", changes: "Changes not live", offline: "Offline", deleted: "Deleted" });
  });
});

describe("listNotices", () => {
  it("counts invitations going offline within 7 days and erasing within 24 hours", () => {
    const now = at("2027-02-20T06:00:00Z");
    const rows = [
      { status: "published", offlineOn: "2027-02-22" },
      { status: "published", offlineOn: "2027-02-27" },
      { status: "published", offlineOn: "2027-02-28" },
      { status: "offline", purgeAt: "2027-02-21T05:00:00Z" },
      { status: "deleted", purgeAt: "2027-02-22T07:00:00Z" },
    ];
    expect(listNotices(rows, now)).toEqual({ goingOffline: 2, erasingSoon: 1 });
  });
});
