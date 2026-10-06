import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { getPalette, getTemplate, TEMPLATES, themeStyle } from "./registry";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { visibleSections } from "../lib/sections";
import { minimalInvitation } from "../testing/fixtures";

const build = (template, overrides = {}) =>
  parseInvitation({ ...template.sample, ...overrides, theme: { ...template.sample.theme, ...overrides.theme } });

const renderedOrder = (container) => [...container.querySelectorAll("[data-section]")].map((el) => el.dataset.section);

describe("registry lookups", () => {
  it("returns null for an unknown template", () => {
    expect(getTemplate("neon")).toBeNull();
  });
  it("falls back to the first palette for an unknown palette", () => {
    const royal = getTemplate("royal");
    expect(getPalette(royal, "missing")).toBe(royal.palettes[0]);
  });
  it("builds a style object with palette and font variables", () => {
    const royal = getTemplate("royal");
    const style = themeStyle(royal, royal.palettes[1].id);
    expect(style["--bg"]).toBe(royal.palettes[1].vars["--bg"]);
    expect(style["--font-display"]).toBeDefined();
  });
});

describe("temple opening", () => {
  it("shows the couple on one line inside the envelope, clear of the flap", () => {
    const temple = getTemplate("temple");
    render(<InvitationRenderer invitation={build(temple, { language: "both" })} />);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    expect(within(cover).getByText("Meera & Arjun")).toBeInTheDocument();
  });
});

describe.each(TEMPLATES.map((t) => [t.id, t]))("template %s", (_id, template) => {
  it("has a valid sample whose palette exists", () => {
    const inv = build(template);
    expect(template.palettes.map((p) => p.id)).toContain(inv.theme.palette);
    expect(inv.templateId).toBe(template.id);
  });

  it.each(template.palettes.map((p) => [p.id]))("renders every visible section with palette %s", (paletteId) => {
    const inv = build(template, { theme: { palette: paletteId } });
    const { container } = render(<InvitationRenderer invitation={inv} ctx={{ mode: "preview" }} />);
    expect(renderedOrder(container)).toEqual(visibleSections(inv));
    expect(container.textContent).not.toContain("undefined");
  });

  it("renders Hindi-only without English labels or undefined", () => {
    const inv = build(template, { language: "hi" });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(container.textContent).toContain(inv.couple.bride.name.hi);
    expect(container.textContent).not.toContain("Save the Date");
    expect(container.textContent).not.toContain("undefined");
  });

  it("renders both languages", () => {
    const inv = build(template, { language: "both" });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(container.textContent).toContain(inv.couple.bride.name.en);
    expect(container.textContent).toContain(inv.couple.bride.name.hi);
  });

  it("omits sections that have no content", () => {
    const inv = parseInvitation({ ...minimalInvitation(), templateId: template.id, theme: { palette: template.palettes[0].id } });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(renderedOrder(container)).toEqual(["invocation", "couple", "saveTheDate", "countdown", "venue"]);
  });

  it("renders an event without a time", () => {
    const inv = build(template, { events: [{ id: "haldi", name: { en: "Haldi" }, date: "2027-02-12" }] });
    render(<InvitationRenderer invitation={inv} />);
    expect(screen.getByText("Haldi")).toBeInTheDocument();
  });

  it("dismisses the opening with a tap or click", () => {
    vi.useFakeTimers();
    render(<InvitationRenderer invitation={build(template)} />);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    fireEvent.click(within(cover).getByRole("button"));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).not.toBeInTheDocument();
  });

  it("hides the credit when showCredit is false", () => {
    const { container, rerender } = render(<InvitationRenderer invitation={build(template)} />);
    expect(container.textContent).toContain("Created by Baba Saab Events");
    rerender(<InvitationRenderer invitation={build(template, { showCredit: false })} />);
    expect(container.textContent).not.toContain("Created by Baba Saab Events");
  });
});
