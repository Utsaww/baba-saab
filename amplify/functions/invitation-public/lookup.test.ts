import { describe, expect, it, vi } from "vitest";
import { lookup } from "./lookup";

const tables = { invitation: "Inv", slug: "Slug" };
const item = {
  id: "inv-1", status: "published", templateId: "royal", content: '{"draft":true}', publishedContent: '{"live":true}',
  previewToken: "tok_1234567890abcdefghij", createdBy: "x", updatedBy: "y", searchText: "s", version: 9, liveVersion: 8,
};

function fakeDb(link: Record<string, unknown> | undefined, inv: Record<string, unknown> | undefined) {
  const calls: any[] = [];
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      calls.push(cmd.input);
      return { Item: cmd.input.TableName === "Slug" ? link : inv };
    }),
  };
}
const run = (inv: Record<string, unknown> | undefined, args: { slug: unknown; previewToken?: string | null }) =>
  lookup(fakeDb({ slug: "a-b", invitationId: "inv-1" }, inv) as any, tables, args);

describe("lookup", () => {
  it("reads the slug, then the invitation it points at", async () => {
    const db = fakeDb({ slug: "priya-weds-rahul", invitationId: "inv-1" }, item);
    await lookup(db as any, tables, { slug: "priya-weds-rahul" });
    expect(db.calls).toEqual([
      { TableName: "Slug", Key: { slug: "priya-weds-rahul" } },
      { TableName: "Inv", Key: { id: "inv-1" } },
    ]);
  });
  it.each(["../x", "Bad", "ab", "a".repeat(61), "-a-b", "a--b", ""])("skips the database for malformed slug %j", async (slug) => {
    const db = fakeDb({ invitationId: "inv-1" }, item);
    await expect(lookup(db as any, tables, { slug })).resolves.toBeNull();
    expect(db.send).not.toHaveBeenCalled();
  });
  it("returns null for a non-string slug", async () => {
    await expect(run(item, { slug: undefined })).resolves.toBeNull();
  });
  it("returns null on a slug miss without reading the invitation", async () => {
    const db = fakeDb(undefined, item);
    await expect(lookup(db as any, tables, { slug: "a-b" })).resolves.toBeNull();
    expect(db.send).toHaveBeenCalledTimes(1);
  });
  it("serves the live copy to everyone", async () => {
    await expect(run(item, { slug: "a-b" })).resolves.toEqual({ mode: "live", templateId: "royal", content: '{"live":true}' });
  });
  it("serves the draft for the right preview token", async () => {
    await expect(run(item, { slug: "a-b", previewToken: item.previewToken })).resolves.toEqual({
      mode: "preview", templateId: "royal", content: '{"draft":true}',
    });
  });
  it("previews a draft with the right token", async () => {
    await expect(run({ ...item, status: "draft", publishedContent: null }, { slug: "a-b", previewToken: item.previewToken })).resolves.toMatchObject({ mode: "preview" });
  });
  it("ignores a wrong or empty token", async () => {
    expect((await run(item, { slug: "a-b", previewToken: "nope" }))!.mode).toBe("live");
    expect((await run({ ...item, previewToken: "" }, { slug: "a-b", previewToken: "" }))!.mode).toBe("live");
  });
  it("hides drafts without the token", async () => {
    await expect(run({ ...item, status: "draft", publishedContent: null }, { slug: "a-b" })).resolves.toBeNull();
  });
  it("hides any other status", async () => {
    await expect(run({ ...item, status: "deleted" }, { slug: "a-b" })).resolves.toBeNull();
    await expect(run({ ...item, status: "deleted" }, { slug: "a-b", previewToken: item.previewToken })).resolves.toBeNull();
  });
  it("previews an offline invitation with the right token, and hides it otherwise", async () => {
    const off = { ...item, status: "offline" };
    await expect(run(off, { slug: "a-b", previewToken: item.previewToken })).resolves.toEqual({
      mode: "preview", templateId: "royal", content: '{"draft":true}',
    });
    await expect(run(off, { slug: "a-b" })).resolves.toBeNull();
    await expect(run(off, { slug: "a-b", previewToken: "nope" })).resolves.toBeNull();
  });
  it("returns null for a missing invitation", async () => {
    await expect(run(undefined, { slug: "a-b" })).resolves.toBeNull();
  });
  it("never returns bookkeeping fields", async () => {
    expect(Object.keys((await run(item, { slug: "a-b" }))!)).toEqual(["mode", "templateId", "content"]);
  });
});
