// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ headers: new Map() }));
vi.mock("next/headers", () => ({ headers: () => ({ get: (name) => store.headers.get(name) ?? null }) }));
vi.mock("../globals.css", () => ({}));

import { generateMetadata } from "./layout";

const withHeaders = (entries) => {
  store.headers = new Map(Object.entries(entries));
  return generateMetadata();
};

describe("invite layout metadata", () => {
  it("bases Open Graph URLs on the forwarded host", async () => {
    const meta = await withHeaders({ "x-forwarded-host": "invites.example.com", "x-forwarded-proto": "https" });
    expect(meta.metadataBase.href).toBe("https://invites.example.com/");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
  it("leaves metadataBase out instead of failing the page when the host is malformed", async () => {
    const meta = await withHeaders({ "x-forwarded-host": "a.com, b.com", "x-forwarded-proto": "https" });
    expect(meta.metadataBase).toBeUndefined();
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
