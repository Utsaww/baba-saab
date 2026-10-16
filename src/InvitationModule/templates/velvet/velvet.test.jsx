import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InvitationRenderer from "../../InvitationRenderer";
import { parseInvitation, TEMPLATE_IDS } from "../../schema/invitation";
import { visibleSections } from "../../lib/sections";
import { getTemplate, TEMPLATES } from "../registry";
import { velvetFontVars, velvetPalettes } from "./palettes";
import { velvetSample } from "./sample";
import own from "./velvet.module.scss";

// WCAG 2 relative luminance and contrast ratio for #rrggbb colours.
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const build = (overrides = {}) => parseInvitation({ ...velvetSample, ...overrides, theme: { ...velvetSample.theme, ...overrides.theme } });

describe("velvet registration", () => {
  it("is registered with a name, description and the sample", () => {
    const velvet = getTemplate("velvet");
    expect(velvet).not.toBeNull();
    expect(velvet.name).toBe("Velvet Envelope");
    expect(velvet.description).toMatch(/\.$/);
    expect(velvet.palettes).toBe(velvetPalettes);
    expect(velvet.fontVars).toBe(velvetFontVars);
    expect(velvet.sample).toBe(velvetSample);
  });

  it("is an allowed template id, and the schema and registry list the same templates", () => {
    expect(TEMPLATE_IDS).toContain("velvet");
    expect([...TEMPLATE_IDS].sort()).toEqual(TEMPLATES.map((t) => t.id).sort());
  });

  it("has a sample that parses, with Mehendi, Haldi, Sangeet and Wedding", () => {
    const inv = build();
    expect(inv.templateId).toBe("velvet");
    expect(inv.theme.palette).toBe("plum-gold");
    expect(inv.events.map((e) => e.name.en)).toEqual(["Mehendi", "Haldi", "Sangeet", "Wedding"]);
  });

  it("uses Great Vibes for display and Cormorant Garamond for text", () => {
    expect(velvetFontVars["--font-display"]).toBe("var(--font-greatvibes)");
    expect(velvetFontVars["--font-body"]).toBe("var(--font-cormorant)");
  });
});

describe("velvet palettes", () => {
  it("starts with Plum & Gold, then Midnight and Emerald", () => {
    expect(velvetPalettes.map((p) => p.id)).toEqual(["plum-gold", "midnight-gold", "emerald-gold"]);
    expect(velvetPalettes[0].vars["--bg"]).toBe("#4E3670");
    expect(velvetPalettes[0].vars["--primary"]).toBe("#E7C68C");
  });

  it("gives every palette the same keys as the first", () => {
    const keys = Object.keys(velvetPalettes[0].vars).sort();
    for (const p of velvetPalettes) expect(Object.keys(p.vars).sort()).toEqual(keys);
  });

  it("defines the shared keys every template uses", () => {
    for (const key of ["--bg", "--surface", "--text", "--muted", "--primary", "--accent", "--on-primary"]) {
      expect(velvetPalettes[0].vars).toHaveProperty(key);
    }
  });

  it.each(velvetPalettes.map((p) => [p.id, p.vars]))("%s keeps gold, ivory and body text at 4.5:1 or more on the card", (_id, v) => {
    for (const fg of ["--primary", "--accent", "--ivory", "--text", "--muted", "--rose"]) {
      expect(contrast(v[fg], v["--bg"]), fg).toBeGreaterThanOrEqual(4.5);
    }
    // Event cards sit on the lifted surface.
    for (const fg of ["--primary", "--text"]) expect(contrast(v[fg], v["--surface"]), fg).toBeGreaterThanOrEqual(4.5);
    // Button text on gold.
    expect(contrast(v["--on-primary"], v["--primary"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("velvet rendering", () => {
  it("opens on a sealed envelope showing the monogram and a tap hint", () => {
    render(<InvitationRenderer invitation={build({ language: "en" })} />);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    const envelope = within(cover).getByRole("button", { name: "Tap to open" });
    expect(envelope).toHaveAttribute("data-open", "false");
    expect(within(envelope).getByText("M&A")).toBeInTheDocument();
    expect(within(envelope).getByText("Meera & Arjun")).toBeInTheDocument();
    expect(within(cover).getByText("Tap to open", { selector: "p" })).toBeInTheDocument();
  });

  it("shows the couple's names on the cover", () => {
    const { container } = render(<InvitationRenderer invitation={build({ language: "en" })} ctx={{ mode: "preview", skipOpening: true }} />);
    const heading = container.querySelector("h1");
    expect(heading).toHaveTextContent("Meera");
    expect(heading).toHaveTextContent("Arjun");
  });

  it("renders every visible section in order", () => {
    const inv = build();
    const { container } = render(<InvitationRenderer invitation={inv} ctx={{ mode: "preview", skipOpening: true }} />);
    const order = [...container.querySelectorAll("[data-section]")].map((el) => el.dataset.section);
    expect(order).toEqual(visibleSections(inv));
    // The sample has content for every section except a film.
    expect(order).toEqual(["invocation", "couple", "saveTheDate", "countdown", "venue", "travel", "schedule", "gallery", "rsvp", "closing"]);
  });

  it("writes the envelope card in Devanagari for a Hindi invitation", () => {
    render(<InvitationRenderer invitation={build({ language: "hi" })} />);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    const envelope = within(cover).getByRole("button", { name: "खोलने के लिए टैप करें" });
    expect(within(envelope).getByText("मीरा & अर्जुन")).toHaveAttribute("lang", "hi");
  });
});

describe("velvet envelope card names", () => {
  const longNames = {
    language: "en",
    couple: {
      ...velvetSample.couple,
      bride: { ...velvetSample.couple.bride, name: { en: "Venkatalakshmi", hi: "वेंकटलक्ष्मी" } },
      groom: { ...velvetSample.couple.groom, name: { en: "Raghunandan", hi: "रघुनंदन" } },
    },
  };
  const cardNames = (text) =>
    within(screen.getByRole("dialog", { name: "Invitation cover" })).getByText(text);

  it("marks short names as short", () => {
    render(<InvitationRenderer invitation={build({ language: "en" })} />);
    expect(cardNames("Meera & Arjun")).toHaveAttribute("data-length", "short");
  });

  it("keeps long names whole and steps the size down instead of cutting them off", () => {
    render(<InvitationRenderer invitation={build(longNames)} />);
    const names = cardNames("Venkatalakshmi & Raghunandan");
    expect(names).toHaveAttribute("data-length", "long");
    expect(names.textContent).not.toContain("…");
  });
});

describe("velvet fade-up wiring", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hands its sections to the fade-up hook when IntersectionObserver exists", () => {
    const observers = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb) {
          this.cb = cb;
          this.targets = [];
          observers.push(this);
        }
        observe(el) {
          this.targets.push(el);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", (query) => ({ matches: false, media: query }));
    const inv = build();
    const { container } = render(<InvitationRenderer invitation={inv} ctx={{ mode: "preview", skipOpening: true }} />);
    const [observer] = observers;
    expect(observer.targets.map((el) => el.dataset.section)).toEqual(visibleSections(inv));
    act(() => observer.cb(observer.targets.map((target) => ({ target, isIntersecting: false }))));
    for (const el of container.querySelectorAll("[data-section]")) expect(el).toHaveClass(own.fadePending);
  });

  it("leaves every section visible without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<InvitationRenderer invitation={build()} ctx={{ mode: "preview", skipOpening: true }} />);
    for (const el of container.querySelectorAll("[data-section]")) expect(el).not.toHaveClass(own.fadePending);
  });
});
