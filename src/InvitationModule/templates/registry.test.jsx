import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { getPalette, getTemplate, TEMPLATES, themeStyle } from "./registry";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { visibleSections } from "../lib/sections";
import { minimalInvitation } from "../testing/fixtures";

const build = (template, overrides = {}) =>
  parseInvitation({ ...template.sample, ...overrides, theme: { ...template.sample.theme, ...overrides.theme } });

const renderedOrder = (container) => [...container.querySelectorAll("[data-section]")].map((el) => el.dataset.section);
// Sections a template draws inside its cover (e.g. Temple's hero) are not repeated as their own sections.
const expectedOrder = (template, ids) => ids.filter((id) => !(template.coverSections ?? []).includes(id));

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

describe("server render", () => {
  it("does not depend on the clock, so cached HTML hydrates after the RSVP deadline", () => {
    const royal = getTemplate("royal");
    const inv = build(royal, { rsvp: { enabled: true, channel: "whatsapp", deadline: "2027-01-31" } });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-15T00:00:00Z"));
    const before = renderToString(<InvitationRenderer invitation={inv} />);
    vi.setSystemTime(new Date("2027-02-20T00:00:00Z"));
    const after = renderToString(<InvitationRenderer invitation={inv} />);
    expect(after).toBe(before);
  });

  it("closes the RSVP form once mounted after the deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-02-20T00:00:00Z"));
    const royal = getTemplate("royal");
    render(<InvitationRenderer invitation={build(royal, { language: "en", rsvp: { enabled: true, channel: "whatsapp", deadline: "2027-01-31" } })} />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("status")).toHaveTextContent("RSVPs closed on");
  });
});

describe("calendar downloads", () => {
  it("gives every event its own UID", async () => {
    const blobs = [];
    URL.createObjectURL = vi.fn((blob) => {
      blobs.push(blob);
      return "blob:x";
    });
    URL.revokeObjectURL = vi.fn();
    // jsdom can't navigate to the download link; stop the click so it doesn't log "Not implemented".
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const royal = getTemplate("royal");
    render(<InvitationRenderer invitation={build(royal, { language: "en", id: "inv1" })} />);
    const downloads = screen.getAllByRole("button", { name: "Download (.ics)" });
    fireEvent.click(downloads[0]);
    fireEvent.click(downloads[1]);
    // jsdom's Blob has no .text(), so read it the older way.
    const readText = (blob) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(blob);
      });
    const uids = await Promise.all(blobs.map(async (b) => /UID:(.*)/.exec(await readText(b))[1].trim()));
    expect(uids).toEqual(["inv1-haldi@babasaab", "inv1-mehendi@babasaab"]);
    click.mockRestore();
  });
});

describe("temple opening", () => {
  it("shows the couple's names above the envelope, in both languages", () => {
    const temple = getTemplate("temple");
    render(<InvitationRenderer invitation={build(temple, { language: "both" })} />);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    expect(within(cover).getByText("Meera & Arjun")).toBeInTheDocument();
    expect(within(cover).getByText("मीरा & अर्जुन")).toBeInTheDocument();
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
    expect(renderedOrder(container)).toEqual(expectedOrder(template, visibleSections(inv)));
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
    expect(renderedOrder(container)).toEqual(expectedOrder(template, ["invocation", "couple", "saveTheDate", "countdown", "venue"]));
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

describe("RSVP on WhatsApp in every template", () => {
  it.each(TEMPLATES.map((t) => [t.id, t]))("%s notes in previews that replies go to the family's WhatsApp", (_id, template) => {
    // The editor preview: no opening, and nothing waits behind Temple's scratch-card lock.
    render(<InvitationRenderer invitation={build(template, { language: "en", rsvp: { enabled: true, channel: "whatsapp" } })} ctx={{ mode: "preview", skipOpening: true }} />);
    expect(screen.getByText("Preview — replies go to the family's WhatsApp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send RSVP on WhatsApp" })).toBeInTheDocument();
  });

  it("hides the RSVP section on a live page that has no family number", () => {
    const royal = getTemplate("royal");
    const inv = build(royal, { language: "en", rsvp: { enabled: true, channel: "whatsapp" }, hosts: { ...royal.sample.hosts, contactPhone: undefined } });
    const { container } = render(<InvitationRenderer invitation={inv} />);
    expect(container.querySelector('[data-section="rsvp"]')).toBeNull();
  });
});

describe("RSVP opt-in, numbers and reply memory", () => {
  const royal = getTemplate("royal");

  it("renders no RSVP section for legacy content switched on before WhatsApp replies", () => {
    const { container } = render(<InvitationRenderer invitation={build(royal, { language: "en", rsvp: { enabled: true } })} ctx={{ mode: "preview" }} />);
    expect(container.querySelector('[data-section="rsvp"]')).toBeNull();
  });

  it("hides the RSVP section on a live page whose number isn't a valid WhatsApp number", () => {
    const inv = build(royal, { language: "en", rsvp: { enabled: true, channel: "whatsapp" }, hosts: { ...royal.sample.hosts, contactPhone: " 12345 " } });
    const { container } = render(<InvitationRenderer invitation={inv} ctx={{ slug: "a-weds-b" }} />);
    expect(container.querySelector('[data-section="rsvp"]')).toBeNull();
  });

  async function reply(slug, name) {
    const user = (await import("@testing-library/user-event")).default;
    await user.type(screen.getByLabelText("Name"), name);
    await user.type(screen.getByLabelText("Phone"), "9876543210");
    await user.click(screen.getByLabelText("Regretfully decline"));
    await user.click(screen.getByRole("button", { name: "Send RSVP on WhatsApp" }));
  }
  const live = (slug) => <InvitationRenderer invitation={build(royal, { language: "en", rsvp: { enabled: true, channel: "whatsapp" } })} ctx={{ slug }} />;

  it("remembers a guest's reply per invitation, so two invitations never share one", async () => {
    vi.spyOn(window, "open").mockImplementation(() => null);
    localStorage.clear();
    const first = render(live("asha-weds-ravi"));
    await reply("asha-weds-ravi", "Verma Ji");
    first.unmount();

    const other = render(live("meera-weds-arjun"));
    await act(async () => {});
    expect(screen.getByLabelText("Name")).toHaveValue("");
    other.unmount();

    render(live("asha-weds-ravi"));
    await act(async () => {});
    expect(screen.getByLabelText("Name")).toHaveValue("Verma Ji");
    localStorage.clear();
  });

  it("never reads or writes the guest's device in previews", async () => {
    vi.spyOn(window, "open").mockImplementation(() => null);
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    render(<InvitationRenderer invitation={build(royal, { language: "en", rsvp: { enabled: true, channel: "whatsapp" } })} ctx={{ mode: "preview", slug: "asha-weds-ravi" }} />);
    await reply("asha-weds-ravi", "Verma Ji");
    const rsvpKeys = (spy) => spy.mock.calls.filter(([key]) => String(key).startsWith("rsvp:"));
    expect(rsvpKeys(get)).toEqual([]);
    expect(rsvpKeys(set)).toEqual([]);
    vi.restoreAllMocks();
  });
});
