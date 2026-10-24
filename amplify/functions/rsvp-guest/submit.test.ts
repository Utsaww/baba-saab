import { describe, expect, it, vi } from "vitest";
import { RsvpError, submit } from "./submit";

const tables = { invitation: "Inv", slug: "Slug", rsvp: "Rsvp", limit: "Limit" };
const NOW = Date.parse("2026-10-24T10:00:00Z");
const HOUR = Math.floor(NOW / 3600000);
const IP = "a".repeat(64);

const live = {
  couple: { bride: { name: { en: "Meera" } }, groom: { name: { en: "Arjun" } } },
  language: "en",
  hosts: { contactPhone: "+91 98765 43210" },
  events: [
    { id: "sangeet", name: { en: "Sangeet" } },
    { id: "wedding", name: { en: "Wedding" } },
  ],
  rsvp: { enabled: true, channel: "whatsapp", deadline: "2026-10-31", askGuestCount: true, askMeal: true },
};
const published = {
  id: "inv-1",
  status: "published",
  content: JSON.stringify({ rsvp: { enabled: false } }),
  publishedContent: JSON.stringify(live),
};
const reply = {
  name: "Rahul Sharma",
  phone: "+91 98111 22233",
  attending: "yes",
  guestCount: 3,
  eventIds: ["sangeet"],
  meal: "veg",
  message: "Congrats!",
};
const condFail = () => Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });

// A small in-memory DynamoDB that understands the few calls submit makes, including the rate-limit condition.
function fakeDb(inv: Record<string, unknown> | null = published) {
  const rsvps = new Map<string, any>();
  const limits = new Map<string, any>();
  const calls: any[] = [];
  const db = {
    calls,
    rsvps,
    limits,
    send: vi.fn(async (cmd: any) => {
      const name = cmd.constructor.name;
      const i = cmd.input;
      calls.push({ name, input: i });
      if (name === "GetCommand" && i.TableName === "Slug") {
        return { Item: i.Key.slug === "a-b" ? { slug: "a-b", invitationId: "inv-1" } : undefined };
      }
      if (name === "GetCommand" && i.TableName === "Inv") return { Item: inv };
      if (name === "GetCommand" && i.TableName === "Rsvp") return { Item: rsvps.get(`${i.Key.invitationId}|${i.Key.rsvpKey}`) };
      if (name === "PutCommand" && i.TableName === "Rsvp") {
        rsvps.set(`${i.Item.invitationId}|${i.Item.rsvpKey}`, i.Item);
        return {};
      }
      if (name === "UpdateCommand" && i.TableName === "Limit") {
        const cur = limits.get(i.Key.key);
        const max = i.ExpressionAttributeValues[":max"];
        if (cur && !(cur.count < max)) throw condFail();
        limits.set(i.Key.key, { count: (cur?.count ?? 0) + 1, expiresAt: cur?.expiresAt ?? i.ExpressionAttributeValues[":exp"] });
        return {};
      }
      if (name === "UpdateCommand" && i.TableName === "Inv") return {};
      throw new Error(`unexpected ${name} ${i.TableName}`);
    }),
  };
  return db;
}
const go = (db: any, args: Record<string, unknown> = {}, now = NOW) =>
  submit(db, tables, { slug: "a-b", reply, ipHash: IP, ...args }, now);

describe("submit", () => {
  it("saves a valid reply with its key and source, then counts it as new on the invitation", async () => {
    const db = fakeDb();
    await expect(go(db)).resolves.toEqual({ ok: true, updated: false });
    const put = db.calls.find((c) => c.name === "PutCommand").input;
    expect(put.TableName).toBe("Rsvp");
    expect(put.Item).toEqual({
      invitationId: "inv-1",
      rsvpKey: "919811122233#rahul sharma",
      phoneKey: "919811122233",
      name: "Rahul Sharma",
      phone: "+91 98111 22233",
      attending: "yes",
      guestCount: 3,
      eventIds: ["sangeet"],
      meal: "veg",
      message: "Congrats!",
      source: "guest",
      __typename: "Rsvp",
      createdAt: new Date(NOW).toISOString(),
      updatedAt: new Date(NOW).toISOString(),
    });
    const names = db.calls.map((c) => `${c.name}:${c.input.TableName}`);
    expect(names.indexOf("UpdateCommand:Inv")).toBeGreaterThan(names.indexOf("PutCommand:Rsvp"));
    const bump = db.calls.find((c) => c.name === "UpdateCommand" && c.input.TableName === "Inv").input;
    expect(bump).toEqual({
      TableName: "Inv",
      Key: { id: "inv-1" },
      UpdateExpression: "ADD rsvpNewCount :one",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: { ":one": 1 },
    });
  });
  it("looks for an earlier reply with a consistent read", async () => {
    const db = fakeDb();
    await go(db);
    const get = db.calls.find((c) => c.name === "GetCommand" && c.input.TableName === "Rsvp").input;
    expect(get).toEqual({ TableName: "Rsvp", Key: { invitationId: "inv-1", rsvpKey: "919811122233#rahul sharma" }, ConsistentRead: true });
  });
  it("accepts the reply as a JSON string too", async () => {
    await expect(go(fakeDb(), { reply: JSON.stringify(reply) })).resolves.toEqual({ ok: true, updated: false });
  });
  it("overwrites the same phone and name, keeping the first reply time", async () => {
    const db = fakeDb();
    await go(db);
    const later = NOW + 60_000;
    await expect(go(db, { reply: { ...reply, name: "rahul  SHARMA", attending: "no" } }, later)).resolves.toEqual({
      ok: true,
      updated: true,
    });
    expect(db.rsvps.size).toBe(1);
    const row = [...db.rsvps.values()][0];
    expect(row).toMatchObject({
      name: "rahul  SHARMA",
      attending: "no",
      createdAt: new Date(NOW).toISOString(),
      updatedAt: new Date(later).toISOString(),
    });
    expect(row.guestCount).toBeUndefined(); // not attending: no head count, events or meal kept
    expect(row.eventIds).toEqual([]);
    expect(row.meal).toBeUndefined();
  });
  it("keeps the same phone with a different name as a separate guest", async () => {
    const db = fakeDb();
    await go(db);
    await expect(go(db, { reply: { ...reply, name: "Asha Sharma" } })).resolves.toEqual({ ok: true, updated: false });
    expect(db.rsvps.size).toBe(2);
  });
  it("drops unknown events, a meal that wasn't asked for and a guest count that wasn't asked for", async () => {
    const db = fakeDb({ ...published, publishedContent: { ...live, rsvp: { ...live.rsvp, askMeal: false, askGuestCount: false } } });
    await go(db, { reply: { ...reply, eventIds: ["sangeet", "ghost", 7] } });
    const item = db.calls.find((c) => c.name === "PutCommand").input.Item;
    expect(item.eventIds).toEqual(["sangeet"]);
    expect(item.meal).toBeUndefined();
    expect(item.guestCount).toBeUndefined();
  });
  it("drops an unknown meal and an empty message", async () => {
    const db = fakeDb();
    await go(db, { reply: { ...reply, meal: "pizza", message: "   " } });
    const item = db.calls.find((c) => c.name === "PutCommand").input.Item;
    expect(item.meal).toBeUndefined();
    expect(item.message).toBeUndefined();
  });

  it.each([
    ["a draft", { ...published, status: "draft" }],
    ["an offline invitation", { ...published, status: "offline" }],
    ["a deleted invitation", { ...published, status: "deleted" }],
    ["a missing invitation", null],
    ["RSVP off in the live copy", { ...published, publishedContent: { ...live, rsvp: { ...live.rsvp, enabled: false } } }],
    ["legacy RSVP without the WhatsApp channel", { ...published, publishedContent: { ...live, rsvp: { enabled: true } } }],
    ["a bad family number", { ...published, publishedContent: { ...live, hosts: { contactPhone: "12345" } } }],
    ["no live copy", { ...published, publishedContent: null }],
  ])("refuses %s as NotFound without saving", async (_label, inv) => {
    const db = fakeDb(inv as any);
    await expect(go(db)).rejects.toMatchObject({ name: "NotFound" });
    expect(db.calls.some((c) => c.name === "PutCommand")).toBe(false);
    expect(db.calls.some((c) => c.input.TableName === "Limit")).toBe(false);
  });
  it("ignores RSVP settings in the draft: only the live copy counts", async () => {
    const draftOn = { ...published, content: JSON.stringify(live), publishedContent: { ...live, rsvp: { enabled: false } } };
    await expect(go(fakeDb(draftOn))).rejects.toMatchObject({ name: "NotFound" });
  });
  it("refuses an unknown or malformed slug as NotFound", async () => {
    await expect(go(fakeDb(), { slug: "x-y" })).rejects.toMatchObject({ name: "NotFound" });
    const db = fakeDb();
    await expect(go(db, { slug: "../Bad" })).rejects.toMatchObject({ name: "NotFound" });
    expect(db.send).not.toHaveBeenCalled();
  });
  it("refuses after the deadline day ends in IST", async () => {
    const db = fakeDb();
    await expect(go(db, {}, Date.parse("2026-10-31T18:29:59Z"))).resolves.toMatchObject({ ok: true });
    await expect(go(db, {}, Date.parse("2026-10-31T18:30:00Z"))).rejects.toMatchObject({ name: "Closed" });
  });
  it("refuses a filled honeypot without touching the database", async () => {
    const db = fakeDb();
    await expect(go(db, { reply: { ...reply, website: "spam" } })).rejects.toMatchObject({ name: "Invalid" });
    expect(db.send).not.toHaveBeenCalled();
  });
  it.each([
    ["no name", { ...reply, name: " " }],
    ["a bad phone", { ...reply, phone: "123" }],
    ["a bad answer", { ...reply, attending: "perhaps" }],
    ["a bad guest count", { ...reply, guestCount: 0 }],
    ["a very long name", { ...reply, name: "x".repeat(101) }],
    ["a very long message", { ...reply, message: "x".repeat(1001) }],
    ["events that aren't a list", { ...reply, eventIds: "sangeet" }],
    ["a message that isn't text", { ...reply, message: { $: 1 } }],
  ])("refuses %s as Invalid", async (_label, r) => {
    const db = fakeDb();
    await expect(go(db, { reply: r })).rejects.toMatchObject({ name: "Invalid" });
    expect(db.calls.some((c) => c.name === "PutCommand")).toBe(false);
  });
  it.each([["not json"], [null], [[1, 2]]])("refuses a reply that isn't an object (%j)", async (r) => {
    await expect(go(fakeDb(), { reply: r })).rejects.toMatchObject({ name: "Invalid" });
  });
  it.each([[""], ["short"], [undefined], ["g".repeat(64)]])("refuses a malformed ipHash %j", async (ipHash) => {
    await expect(go(fakeDb(), { ipHash })).rejects.toMatchObject({ name: "Invalid" });
  });

  it("allows 5 replies an hour from one phone and refuses the 6th", async () => {
    const db = fakeDb();
    for (let n = 0; n < 5; n++) {
      await expect(go(db, { reply: { ...reply, name: `Guest ${n}` } })).resolves.toMatchObject({ ok: true });
    }
    await expect(go(db, { reply: { ...reply, name: "Guest 6" } })).rejects.toMatchObject({ name: "RateLimited" });
    expect(db.rsvps.size).toBe(5);
    // A new hour starts a new window.
    await expect(go(db, { reply: { ...reply, name: "Guest 6" } }, NOW + 3600_000)).resolves.toMatchObject({ ok: true });
  });
  it("lets 20 guests on one venue network all save, and refuses the 61st from that network", async () => {
    const db = fakeDb();
    const phone = (n: number) => `98${String(n).padStart(8, "0")}`;
    for (let n = 0; n < 20; n++) {
      await expect(go(db, { reply: { ...reply, phone: phone(n) } })).resolves.toMatchObject({ ok: true });
    }
    for (let n = 20; n < 60; n++) await go(db, { reply: { ...reply, phone: phone(n) } });
    expect(db.rsvps.size).toBe(60);
    await expect(go(db, { reply: { ...reply, phone: phone(60) } })).rejects.toMatchObject({ name: "RateLimited" });
    expect(db.rsvps.size).toBe(60);
  });
  it("counts with one atomic conditional update per key, expiring an hour from now", async () => {
    const db = fakeDb();
    await go(db);
    const ups = db.calls.filter((c) => c.name === "UpdateCommand" && c.input.TableName === "Limit").map((c) => c.input);
    expect(ups.map((u) => u.Key.key)).toEqual([`phone#919811122233#${HOUR}`, `ip#${IP}#${HOUR}`]);
    for (const u of ups) {
      expect(u.UpdateExpression).toContain("ADD #count :one");
      expect(u.UpdateExpression).toContain("expiresAt = if_not_exists(expiresAt, :exp)");
      expect(u.ConditionExpression).toBe("attribute_not_exists(#count) OR #count < :max");
      expect(u.ExpressionAttributeNames).toMatchObject({ "#count": "count" });
      expect(u.ExpressionAttributeValues[":exp"]).toBe(Math.floor(NOW / 1000) + 3600);
    }
    expect(ups[0].ExpressionAttributeValues[":max"]).toBe(5);
    expect(ups[1].ExpressionAttributeValues[":max"]).toBe(60);
    expect([...db.limits.values()].every((l) => l.expiresAt === Math.floor(NOW / 1000) + 3600)).toBe(true);
  });
  it("still reports the reply saved if the new-reply count can't be bumped", async () => {
    const db = fakeDb();
    const orig = db.send.getMockImplementation()!;
    db.send.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name === "UpdateCommand" && cmd.input.TableName === "Inv") throw condFail();
      return orig(cmd);
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(go(db)).resolves.toEqual({ ok: true, updated: false });
    expect(warn).toHaveBeenCalledWith("rsvp-guest: new-reply count not bumped", "inv-1", expect.anything());
    warn.mockRestore();
  });
  it("passes on unexpected rate-limit errors instead of calling them RateLimited", async () => {
    const db = fakeDb();
    const orig = db.send.getMockImplementation()!;
    db.send.mockImplementation(async (cmd: any) => {
      if (cmd.input.TableName === "Limit") throw new Error("ProvisionedThroughputExceeded");
      return orig(cmd);
    });
    await expect(go(db)).rejects.toThrow("ProvisionedThroughputExceeded");
    expect(db.rsvps.size).toBe(0);
  });
  it("RsvpError carries its name as the GraphQL errorType", () => {
    expect(new RsvpError("Closed", "x").name).toBe("Closed");
  });
});
