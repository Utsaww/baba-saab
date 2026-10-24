import { describe, expect, it, vi } from "vitest";
import { family } from "./family";

const tables = { invitation: "Inv", slug: "Slug", rsvp: "Rsvp", limit: "Limit" };
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const live = {
  couple: { bride: { name: { en: "Meera" } }, groom: { name: { en: "Arjun" } }, order: "groom-first" },
  language: "both",
  hosts: { contactPhone: "+91 98765 43210" },
  events: [
    { id: "sangeet", name: { en: "Sangeet", hi: "संगीत" }, date: "2026-11-20", venue: { name: "Hall" } },
    { id: "wedding", name: { en: "Wedding" } },
  ],
};
const inv = {
  id: "inv-1",
  status: "published",
  familyToken: TOKEN,
  previewToken: "pppppppppppppppppppppp",
  content: JSON.stringify({ ...live, couple: { bride: { name: { en: "Draft" } }, groom: { name: { en: "Only" } } } }),
  publishedContent: JSON.stringify(live),
};
const row = (rsvpKey: string, updatedAt: string, extra: Record<string, unknown> = {}) => ({
  invitationId: "inv-1",
  rsvpKey,
  phoneKey: rsvpKey.split("#")[0],
  name: rsvpKey.split("#")[1],
  phone: "98111 22233",
  attending: "yes",
  eventIds: [],
  source: "guest",
  __typename: "Rsvp",
  createdAt: updatedAt,
  updatedAt,
  ...extra,
});
const pages = [
  { Items: [row("911#a", "2026-10-20T10:00:00.000Z"), row("911#b", "2026-10-22T10:00:00.000Z")], LastEvaluatedKey: { k: 1 } },
  { Items: [row("912#c", "2026-10-21T10:00:00.000Z")] },
];

function fakeDb(item: Record<string, unknown> | null = inv) {
  const calls: any[] = [];
  let page = 0;
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      const name = cmd.constructor.name;
      calls.push({ name, input: cmd.input });
      if (name === "GetCommand" && cmd.input.TableName === "Slug") {
        return { Item: cmd.input.Key.slug === "a-b" ? { slug: "a-b", invitationId: "inv-1" } : undefined };
      }
      if (name === "GetCommand" && cmd.input.TableName === "Inv") return { Item: item };
      if (name === "QueryCommand") return pages[page++];
      throw new Error(`unexpected ${name}`);
    }),
  };
}

describe("family", () => {
  it("returns the couple, language, events and every reply, newest first, for the right token", async () => {
    const db = fakeDb();
    const out = await family(db as any, tables, { slug: "a-b", token: TOKEN });
    expect(out).toEqual({
      couple: live.couple,
      language: "both",
      events: [
        { id: "sangeet", name: { en: "Sangeet", hi: "संगीत" } },
        { id: "wedding", name: { en: "Wedding" } },
      ],
      rows: [
        expect.objectContaining({ rsvpKey: "911#b" }),
        expect.objectContaining({ rsvpKey: "912#c" }),
        expect.objectContaining({ rsvpKey: "911#a" }),
      ],
    });
    for (const r of out!.rows) {
      expect(r).not.toHaveProperty("invitationId");
      expect(r).not.toHaveProperty("__typename");
      expect(r.phone).toBe("98111 22233");
    }
    const queries = db.calls.filter((c) => c.name === "QueryCommand").map((c) => c.input);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toMatchObject({
      TableName: "Rsvp",
      KeyConditionExpression: "invitationId = :id",
      ExpressionAttributeValues: { ":id": "inv-1" },
    });
    expect(queries[1].ExclusiveStartKey).toEqual({ k: 1 });
  });
  it("never returns the invitation's other secrets", async () => {
    const out = await family(fakeDb() as any, tables, { slug: "a-b", token: TOKEN });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
    expect(JSON.stringify(out)).not.toContain("pppppppppp");
    expect(JSON.stringify(out)).not.toContain("contactPhone");
  });
  it("uses the draft content when nothing is published yet", async () => {
    const out = await family(fakeDb({ ...inv, status: "draft", publishedContent: null }) as any, tables, { slug: "a-b", token: TOKEN });
    expect(out!.couple.bride.name.en).toBe("Draft");
  });
  it("works for an offline invitation", async () => {
    await expect(family(fakeDb({ ...inv, status: "offline" }) as any, tables, { slug: "a-b", token: TOKEN })).resolves.not.toBeNull();
  });
  it.each([
    ["a wrong token", { token: "AbCdEfGhIjKlMnOpQrStUw" }],
    ["a prefix of the token", { token: TOKEN.slice(0, 21) }],
    ["the token plus more", { token: `${TOKEN}x` }],
    ["no token", { token: "" }],
    ["a missing token", { token: undefined }],
    ["the preview token", { token: "pppppppppppppppppppppp" }],
  ])("returns null for %s without reading replies", async (_label, args) => {
    const db = fakeDb();
    await expect(family(db as any, tables, { slug: "a-b", ...args })).resolves.toBeNull();
    expect(db.calls.some((c) => c.name === "QueryCommand")).toBe(false);
  });
  it("returns null when the invitation has no family token yet, even for an empty token", async () => {
    const db = fakeDb({ ...inv, familyToken: null });
    await expect(family(db as any, tables, { slug: "a-b", token: "" })).resolves.toBeNull();
    await expect(family(db as any, tables, { slug: "a-b", token: "null" })).resolves.toBeNull();
    expect(db.calls.some((c) => c.name === "QueryCommand")).toBe(false);
  });
  it("returns null for a deleted invitation, even with the right token", async () => {
    const db = fakeDb({ ...inv, status: "deleted" });
    await expect(family(db as any, tables, { slug: "a-b", token: TOKEN })).resolves.toBeNull();
    expect(db.calls.some((c) => c.name === "QueryCommand")).toBe(false);
  });
  it("returns null for an erased invitation or an unknown slug", async () => {
    await expect(family(fakeDb(null) as any, tables, { slug: "a-b", token: TOKEN })).resolves.toBeNull();
    await expect(family(fakeDb() as any, tables, { slug: "x-y", token: TOKEN })).resolves.toBeNull();
  });
  it("skips the database for a malformed slug", async () => {
    const db = fakeDb();
    await expect(family(db as any, tables, { slug: "../Bad", token: TOKEN })).resolves.toBeNull();
    expect(db.send).not.toHaveBeenCalled();
  });
});
