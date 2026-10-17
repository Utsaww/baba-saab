import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { getTemplate } from "./registry";

const NAMES = {
  bride: { name: { en: "Zinnia", hi: "ज़िन्निया" }, parentsLine: { en: "D/o Bride Parents", hi: "पुत्री वधू माता-पिता" } },
  groom: { name: { en: "Quentin", hi: "क्वेंटिन" }, parentsLine: { en: "S/o Groom Parents", hi: "पुत्र वर माता-पिता" } },
};

function build(id, { order, language = "en" } = {}) {
  const t = getTemplate(id);
  const couple = { bride: { ...NAMES.bride }, groom: { ...NAMES.groom } };
  if (order) couple.order = order;
  return parseInvitation({ ...t.sample, language, couple });
}

const text = (inv) => render(<InvitationRenderer invitation={inv} />).container;
const before = (haystack, a, b) => {
  const i = haystack.indexOf(a);
  const j = haystack.indexOf(b);
  expect(i).toBeGreaterThanOrEqual(0);
  expect(j).toBeGreaterThanOrEqual(0);
  return i < j;
};

describe.each(["royal", "floral", "velvet"])("couple order in %s", (id) => {
  it("names the bride first by default", () => {
    const c = text(build(id));
    expect(before(c.textContent, "Zinnia", "Quentin")).toBe(true);
    const section = c.querySelector('[data-section="couple"]').textContent;
    expect(before(section, "D/o Bride Parents", "S/o Groom Parents")).toBe(true);
  });

  it("names the groom first, with the parents line, in the couple section and the cover", () => {
    const c = text(build(id, { order: "groom-first" }));
    const section = c.querySelector('[data-section="couple"]').textContent;
    expect(before(section, "Quentin", "Zinnia")).toBe(true);
    expect(before(section, "S/o Groom Parents", "D/o Bride Parents")).toBe(true);
    const cover = c.textContent.slice(0, c.textContent.indexOf(section));
    expect(before(cover, "Quentin", "Zinnia")).toBe(true);
  });

  it("names the groom first in Hindi", () => {
    const c = text(build(id, { order: "groom-first", language: "hi" }));
    const section = c.querySelector('[data-section="couple"]').textContent;
    expect(before(section, "क्वेंटिन", "ज़िन्निया")).toBe(true);
    expect(before(section, "पुत्र वर माता-पिता", "पुत्री वधू माता-पिता")).toBe(true);
    const cover = c.textContent.slice(0, c.textContent.indexOf(section));
    expect(before(cover, "क्वेंटिन", "ज़िन्निया")).toBe(true);
  });
});

describe.each(["royal", "floral", "temple", "velvet", "minimal"])("cover heading in %s", (id) => {
  it.each([
    ["en", "Zinnia", "Quentin"],
    ["hi", "ज़िन्निया", "क्वेंटिन"],
    ["both", "Zinnia", "Quentin"],
  ])("follows the order in %s", (language, bride, groom) => {
    const heading = (order) => text(build(id, { order, language })).querySelector("header h1")?.textContent ?? "";
    expect(before(heading(undefined), bride, groom)).toBe(true);
    expect(before(heading("bride-first"), bride, groom)).toBe(true);
    expect(before(heading("groom-first"), groom, bride)).toBe(true);
  });
});

describe("share text", () => {
  it("names the groom first when groom-first", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    text(build("royal", { order: "groom-first" }));
    fireEvent.click(screen.getByRole("button", { name: "Share on WhatsApp" }));
    const shared = decodeURIComponent(open.mock.calls[0][0].split("text=")[1]);
    expect(before(shared, "Quentin", "Zinnia")).toBe(true);
    open.mockRestore();
  });
});
