import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import InvitationRenderer from "../../InvitationRenderer";
import { parseInvitation, TEMPLATE_IDS } from "../../schema/invitation";
import { visibleSections } from "../../lib/sections";
import { fontVariables } from "../fonts";
import { getTemplate } from "../registry";
import { TEMPLE_COVER_SECTIONS } from "./index";
import { templeFontVars, templePalettes } from "./palettes";
import { templeSample } from "./sample";
import own from "./temple.module.scss";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The stylesheet source, for stacking and animation rules jsdom cannot evaluate.
const scss = readFileSync(resolve(__dirname, "temple.module.scss"), "utf8");
// The text of the first top-level rule for `selector`, braces balanced.
function rule(selector) {
  const at = scss.indexOf(`\n${selector} {`);
  if (at < 0) return "";
  let depth = 0;
  for (let i = scss.indexOf("{", at); i < scss.length; i++) {
    if (scss[i] === "{") depth++;
    if (scss[i] === "}" && --depth === 0) return scss.slice(at, i + 1);
  }
  return "";
}

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

const build = (overrides = {}) =>
  parseInvitation({ ...templeSample, ...overrides, theme: { ...templeSample.theme, ...overrides.theme } });
const guest = (inv) => render(<InvitationRenderer invitation={inv} />);
const editor = (inv) => render(<InvitationRenderer invitation={inv} ctx={{ mode: "preview", skipOpening: true }} />);
// A page with the opening already dismissed is what guests scroll; the dialog stays out of the way.
const section = (container, id) => container.querySelector(`[data-section="${id}"]`);
const isLocked = (el) => Boolean(el.closest("[hidden]"));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("temple registration", () => {
  it("keeps its id, name and sample, and lists the sections its cover shows", () => {
    const temple = getTemplate("temple");
    expect(TEMPLATE_IDS).toContain("temple");
    expect(temple.name).toBe("Temple Classic");
    expect(temple.description).toMatch(/scratch/i);
    expect(temple.palettes).toBe(templePalettes);
    expect(temple.fontVars).toBe(templeFontVars);
    expect(temple.sample).toBe(templeSample);
    expect(temple.coverSections).toBe(TEMPLE_COVER_SECTIONS);
    expect(TEMPLE_COVER_SECTIONS).toEqual(["invocation", "couple"]);
  });

  it("sets Prata, Lora, Italianno and Tenor Sans, and loads them", () => {
    expect(templeFontVars).toEqual({
      "--font-display": "var(--font-prata)",
      "--font-body": "var(--font-lora)",
      "--font-script": "var(--font-italianno)",
      "--font-label": "var(--font-tenor)",
    });
    for (const f of ["font-prata", "font-lora", "font-italianno", "font-tenor", "font-hindi"]) expect(fontVariables).toContain(f);
  });
});

describe("temple palettes", () => {
  it("keeps the stored ids, with new names, Wine & Rose first", () => {
    expect(templePalettes.map((p) => p.id)).toEqual(["kumkum", "banana-leaf", "temple-gold"]);
    expect(templePalettes.map((p) => p.name)).toEqual(["Wine & Rose", "Sage & Gold", "Ivory & Gold"]);
  });

  it("paints Wine & Rose in the agreed colours", () => {
    expect(templePalettes[0].vars).toMatchObject({
      "--bg": "#FCF7F1",
      "--band": "#F6ECE3",
      "--text": "#3E2126",
      "--muted": "#7A5A5E",
      "--primary": "#8A3E46",
      "--primary-deep": "#5E2129",
      "--rose": "#C4808A",
      "--rose-deep": "#A85563",
      "--gold": "#C4A052",
      "--gold-soft": "#E2CE9A",
      "--line": "rgba(138, 62, 70, 0.18)",
      "--envelope": "#8A3E46",
      "--envelope-deep": "#5E2129",
    });
  });

  it("gives every palette the same keys, including the shared ones", () => {
    const keys = Object.keys(templePalettes[0].vars).sort();
    for (const p of templePalettes) expect(Object.keys(p.vars).sort()).toEqual(keys);
    for (const key of ["--bg", "--surface", "--text", "--muted", "--primary", "--accent", "--on-primary", "--petal", "--petal-2"]) {
      expect(keys).toContain(key);
    }
  });

  it("uses each palette's deep accent for the envelope on Sage and Ivory", () => {
    for (const p of templePalettes.slice(1)) expect(p.vars["--envelope"]).toBe(p.vars["--primary-deep"]);
  });

  it.each(templePalettes.map((p) => [p.id, p.vars]))("%s keeps text at 4.5:1 or more on paper, band and cards", (_id, v) => {
    for (const bg of ["--bg", "--band", "--surface"]) {
      for (const fg of ["--text", "--muted", "--primary", "--primary-deep"]) {
        expect(contrast(v[fg], v[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      // The rose "&" is large script: 3:1 is the bar for large text.
      expect(contrast(v["--rose-deep"], v[bg]), `--rose-deep on ${bg}`).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(v["--rose-deep"], v["--bg"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v["--on-primary"], v["--primary"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v["--on-primary"], v["--primary-deep"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("temple sample", () => {
  it("parses, with Wine & Rose, both languages and a Saturday wedding", () => {
    const inv = build();
    expect(inv.templateId).toBe("temple");
    expect(inv.theme.palette).toBe("kumkum");
    expect(inv.language).toBe("both");
    expect(inv.mainDate).toBe("2027-11-27");
  });

  it("has parents lines, dress codes on every event and story photos", () => {
    const inv = build();
    expect(inv.couple.bride.parentsLine.en).toMatch(/^Daughter of /);
    expect(inv.couple.groom.parentsLine.en).toMatch(/^Son of /);
    expect(inv.events.length).toBeGreaterThanOrEqual(3);
    for (const ev of inv.events) expect(ev.dressCode.en, ev.id).toBeTruthy();
    expect(inv.media.gallery.length).toBeGreaterThanOrEqual(4);
  });
});

describe("temple opening", () => {
  it("is a wine envelope sealed with the couple's monogram", () => {
    guest(build({ language: "en" }));
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    const envelope = within(cover).getByRole("button", { name: "Tap to open the invitation" });
    expect(envelope).toHaveAttribute("data-open", "false");
    expect(envelope.querySelector('[data-part="seal"]')).toHaveTextContent("M&A");
    expect(within(cover).getByText("Tap to open", { selector: "p" })).toBeInTheDocument();
  });

  it("seals the envelope groom-first when the groom is named first", () => {
    guest(build({ language: "en", couple: { ...templeSample.couple, order: "groom-first" } }));
    const envelope = screen.getByRole("button", { name: "Tap to open the invitation" });
    expect(envelope.querySelector('[data-part="seal"]')).toHaveTextContent("A&M");
  });

  it("puts only the monogram and a 'Save the Date' line on the letter", () => {
    guest(build({ language: "en" }));
    const letter = screen.getByRole("button", { name: "Tap to open the invitation" }).querySelector('[data-part="letter"]');
    expect(letter).toHaveTextContent("M&A");
    expect(letter).toHaveTextContent("Save the Date");
    expect(letter.textContent).not.toMatch(/\d/);
  });

  it("writes the letter's line in Hindi for a Hindi invitation", () => {
    guest(build({ language: "hi" }));
    const letter = screen.getByRole("button", { name: "निमंत्रण खोलने के लिए टैप करें" }).querySelector('[data-part="letter"]');
    expect(letter).toHaveTextContent("तिथि याद रखें");
  });

  it("is labelled in Hindi for a Hindi invitation", () => {
    guest(build({ language: "hi" }));
    expect(screen.getByRole("button", { name: "निमंत्रण खोलने के लिए टैप करें" })).toBeInTheDocument();
  });

  it("swings the flap open, bursts gold sparkles, then lets the page through", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query) => ({ matches: false, media: query }));
    guest(build({ language: "en" }));
    const envelope = screen.getByRole("button", { name: "Tap to open the invitation" });
    expect(envelope.querySelector("canvas")).toBeNull();
    act(() => envelope.click());
    expect(envelope).toHaveAttribute("data-open", "true");
    expect(envelope.querySelector('canvas[aria-hidden="true"]')).not.toBeNull();
    // Still opening after a second: the letter is rising.
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("dialog", { name: "Invitation cover" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).toBeNull();
  });

  it("opens with a simple, quick fade and no sparkles under reduced motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query) => ({ matches: query.includes("reduce"), media: query }));
    guest(build({ language: "en" }));
    const envelope = screen.getByRole("button", { name: "Tap to open the invitation" });
    act(() => envelope.click());
    expect(envelope.querySelector("canvas")).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).toBeNull();
  });

  it("starts the falling petals once the envelope has opened", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query) => ({ matches: false, media: query }));
    const { container } = guest(build({ language: "en" }));
    expect(container.querySelector(`canvas.${own.petals}`)).toBeNull();
    act(() => screen.getByRole("button", { name: "Tap to open the invitation" }).click());
    act(() => vi.advanceTimersByTime(4000));
    expect(container.querySelector(`canvas.${own.petals}`)).toHaveAttribute("aria-hidden", "true");
  });
});

describe("temple hero", () => {
  it("frames the invocation, a blessing and the couple, with each person's parents", () => {
    const { container } = editor(build({ language: "en" }));
    const header = container.querySelector("header");
    expect(within(header).getByRole("img", { name: "Shri Ganeshaya Namah" })).toBeInTheDocument();
    expect(header).toHaveTextContent(/we joyfully invite you to celebrate the union of/i);
    const h1 = header.querySelector("h1");
    const text = h1.textContent;
    expect(text.indexOf("Meera")).toBeLessThan(text.indexOf("Arjun"));
    expect(text.indexOf("Daughter of")).toBeLessThan(text.indexOf("Son of"));
    expect(text.indexOf("Meera")).toBeLessThan(text.indexOf("Daughter of"));
    expect(text.indexOf("Daughter of")).toBeLessThan(text.indexOf("Arjun"));
  });

  it("follows the groom-first order, parents lines included", () => {
    const { container } = editor(build({ language: "en", couple: { ...templeSample.couple, order: "groom-first" } }));
    const text = container.querySelector("header h1").textContent;
    expect(text.indexOf("Arjun")).toBeLessThan(text.indexOf("Son of"));
    expect(text.indexOf("Son of")).toBeLessThan(text.indexOf("Meera"));
    expect(text.indexOf("Meera")).toBeLessThan(text.indexOf("Daughter of"));
  });

  it("shows the invocation and couple in the hero instead of as separate sections", () => {
    const { container } = editor(build());
    expect(section(container, "invocation")).toBeNull();
    expect(section(container, "couple")).toBeNull();
  });

  it("drops the emblem and shloka when staff hide the invocation", () => {
    const { container } = editor(build({ language: "en", theme: { hidden: ["invocation"] } }));
    expect(within(container.querySelector("header")).queryByRole("img", { name: "Shri Ganeshaya Namah" })).toBeNull();
  });

  it("never gives the date away before the scratch cards — not in the hero, not on the envelope", () => {
    const { container } = guest(build({ language: "en" }));
    expect(container.querySelector("main header").textContent).not.toMatch(/2027|November/);
    const cover = screen.getByRole("dialog", { name: "Invitation cover" });
    expect(cover.textContent).not.toMatch(/2027|November|27 · 11/);
  });

  it("shows each person's portrait above their name, in the chosen order", () => {
    const withPhotos = (order) => ({
      ...templeSample.couple,
      order,
      bride: { ...templeSample.couple.bride, photoKey: "https://example.com/bride.jpg" },
      groom: { ...templeSample.couple.groom, photoKey: "https://example.com/groom.jpg" },
    });
    for (const [order, first, second] of [["bride-first", "bride", "groom"], ["groom-first", "groom", "bride"]]) {
      const { container, unmount } = editor(build({ language: "en", couple: withPhotos(order) }));
      const portraits = [...container.querySelectorAll('header [data-part="portrait"] img')];
      expect(portraits.map((img) => img.getAttribute("src"))).toEqual([`https://example.com/${first}.jpg`, `https://example.com/${second}.jpg`]);
      const name = first === "bride" ? "Meera" : "Arjun";
      // Decorative inside the heading: the name sits right below, so it isn't read twice.
      expect(portraits[0]).toHaveAttribute("alt", "");
      // The portrait sits in its own person's block, before the name.
      const person = portraits[0].closest('[data-part="person"]');
      expect(person.firstElementChild).toHaveAttribute("data-part", "portrait");
      expect(person.textContent).toContain(name);
      unmount();
    }
  });

  it("shows no portrait frame for someone without a photo", () => {
    const { container } = editor(build({ language: "en" }));
    expect(container.querySelectorAll('[data-part="portrait"]')).toHaveLength(0);
  });

  it("drops the parents lines and portraits when staff hide the couple, keeping the names", () => {
    const couple = { ...templeSample.couple, bride: { ...templeSample.couple.bride, photoKey: "https://example.com/bride.jpg" } };
    const { container } = editor(build({ language: "en", couple, theme: { hidden: ["couple"] } }));
    const header = container.querySelector("header");
    expect(header.textContent).toContain("Meera");
    expect(header.textContent).not.toContain("Daughter of");
    expect(header.querySelectorAll('[data-part="portrait"]')).toHaveLength(0);
  });

  it("doesn't preload the faint cover photo", () => {
    const { container } = editor(build({ language: "en" }));
    const cover = container.querySelector(`header img[src="${build().media.coverKey}"]`);
    expect(cover).not.toBeNull();
    expect(cover).not.toHaveAttribute("data-priority");
  });

  it("writes the blessing in Hindi for a Hindi invitation", () => {
    const { container } = editor(build({ language: "hi" }));
    expect(container.querySelector("header").textContent).not.toMatch(/joyfully/);
    expect(container.querySelector("header").textContent).toContain("मीरा");
  });
});

describe("temple scratch cards", () => {
  const cardValues = (el) => [...el.querySelectorAll('[data-part="value"]')].map((v) => v.textContent);

  it("offers Month, Date and Year cards for the wedding date", () => {
    const { container } = guest(build({ language: "en" }));
    const std = section(container, "saveTheDate");
    expect(within(std).getAllByRole("button", { name: /: scratch, or press Enter to reveal$/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Month: scratch, or press Enter to reveal",
      "Date: scratch, or press Enter to reveal",
      "Year: scratch, or press Enter to reveal",
    ]);
    expect(cardValues(std)).toEqual(["Nov", "27", "2027"]);
  });

  it("uses Hindi labels and the Hindi month for a Hindi invitation", () => {
    const { container } = guest(build({ language: "hi" }));
    const std = section(container, "saveTheDate");
    expect(cardValues(std)).toEqual(["नवंबर", "27", "2027"]);
    for (const label of ["माह", "दिनांक", "वर्ष"]) expect(within(std).getByText(label)).toBeInTheDocument();
  });

  it("locks every section after Save the Date until all three are revealed", () => {
    const inv = build({ language: "en" });
    const { container } = guest(inv);
    const ids = visibleSections(inv).filter((id) => !TEMPLE_COVER_SECTIONS.includes(id));
    const after = ids.slice(ids.indexOf("saveTheDate") + 1);
    expect(after.length).toBeGreaterThan(3);
    expect(isLocked(section(container, "saveTheDate"))).toBe(false);
    for (const id of after) {
      const gate = section(container, id).closest("[hidden]");
      expect(gate, id).not.toBeNull();
      expect(gate).toHaveAttribute("inert");
      expect(gate).toHaveAttribute("aria-hidden", "true");
    }
    expect(screen.getByText("Scratch all three cards to unlock the rest of the invitation")).toBeInTheDocument();
    expect(section(container, "saveTheDate").textContent).not.toContain("Saturday");
  });

  it("reveals all three and unlocks the invitation with the Reveal button", () => {
    const { container } = guest(build({ language: "en" }));
    const std = section(container, "saveTheDate");
    fireEvent.click(within(std).getByRole("button", { name: "Reveal" }));
    expect(within(std).queryAllByRole("button", { name: /scratch/ })).toHaveLength(0);
    expect(container.querySelector("main [hidden]")).toBeNull();
    expect(std).toHaveTextContent("Saturday, 27 November 2027");
    expect(screen.queryByText("Scratch all three cards to unlock the rest of the invitation")).toBeNull();
    expect(within(std).queryByRole("button", { name: "Reveal" })).toBeNull();
  });

  it("can be revealed card by card from the keyboard, moving focus along", async () => {
    const user = userEvent.setup();
    const { container } = guest(build({ language: "en" }));
    const std = section(container, "saveTheDate");
    const [month] = within(std).getAllByRole("button", { name: /scratch/ });
    month.focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toHaveAttribute("aria-label", "Date: scratch, or press Enter to reveal");
    expect(isLocked(section(container, "venue"))).toBe(true);
    await user.keyboard(" ");
    expect(document.activeElement).toHaveAttribute("aria-label", "Year: scratch, or press Enter to reveal");
    await user.keyboard("{Enter}");
    expect(isLocked(section(container, "venue"))).toBe(false);
    // Focus lands on the full date, which is now announced.
    expect(document.activeElement).toHaveTextContent("Saturday, 27 November 2027");
  });

  it("does not reveal a card on a mouse click — guests scratch it", async () => {
    const user = userEvent.setup();
    const { container } = guest(build({ language: "en" }));
    const std = section(container, "saveTheDate");
    const [month] = within(std).getAllByRole("button", { name: /scratch/ });
    await user.click(month);
    expect(within(std).getAllByRole("button", { name: /scratch/ })).toHaveLength(3);
  });

  it("stays unlocked for the rest of the visit", () => {
    const inv = build({ language: "en" });
    const { container, rerender } = guest(inv);
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    rerender(<InvitationRenderer invitation={{ ...inv }} />);
    expect(container.querySelector("main [hidden]")).toBeNull();
  });

  it("has no lock in the editor preview: everything shows, date included", () => {
    const { container } = editor(build({ language: "en" }));
    expect(container.querySelector("main [hidden]")).toBeNull();
    expect(screen.queryByText("Scratch all three cards to unlock the rest of the invitation")).toBeNull();
    const std = section(container, "saveTheDate");
    expect(within(std).queryAllByRole("button", { name: /scratch/ })).toHaveLength(0);
    expect(std).toHaveTextContent("Saturday, 27 November 2027");
  });

  it("has no lock and no cards when the invitation has no date", () => {
    const inv = { ...build({ language: "en" }), mainDate: undefined };
    const { container } = guest(inv);
    expect(container.querySelector("main [hidden]")).toBeNull();
    expect(container.querySelectorAll('[data-part="value"]')).toHaveLength(0);
  });

  it("has no lock when staff hide Save the Date", () => {
    const { container } = guest(build({ language: "en", theme: { hidden: ["saveTheDate"] } }));
    expect(container.querySelector("main [hidden]")).toBeNull();
  });

  it("still locks under reduced motion, and the Reveal button still works", () => {
    vi.stubGlobal("matchMedia", (query) => ({ matches: query.includes("reduce"), media: query }));
    const { container } = guest(build({ language: "en" }));
    expect(isLocked(section(container, "venue"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    expect(isLocked(section(container, "venue"))).toBe(false);
  });

  it("writes the lock line and Reveal button in Hindi", () => {
    guest(build({ language: "hi" }));
    expect(screen.getByText("निमंत्रण का बाक़ी हिस्सा देखने के लिए तीनों कार्ड खुरचें")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "दिखाएँ" })).toBeInTheDocument();
  });
});

describe("temple sections", () => {
  it("names the gallery 'Forever us' over the shared photo grid", () => {
    const { container } = editor(build({ language: "en" }));
    const gallery = section(container, "gallery");
    expect(gallery).toHaveTextContent("Forever us");
    expect(within(gallery).getAllByRole("button", { name: /^Open / }).length).toBe(build().media.gallery.length);
  });

  it("closes with warm regards, the families, the couple in script and a share button", () => {
    const { container } = editor(build({ language: "en" }));
    const closing = section(container, "closing");
    expect(closing).toHaveTextContent("Warm regards");
    expect(closing).toHaveTextContent("Smt. Sunita & Shri Rajesh Sharma");
    expect(closing.querySelector('[data-part="closing-names"]')).toHaveTextContent("Meera & Arjun");
    expect(within(closing).getByRole("button", { name: "Share on WhatsApp" })).toBeInTheDocument();
  });

  it("names the couple groom-first in the closing when the groom is named first", () => {
    const { container } = editor(build({ language: "en", couple: { ...templeSample.couple, order: "groom-first" } }));
    expect(section(container, "closing").querySelector('[data-part="closing-names"]')).toHaveTextContent("Arjun & Meera");
  });
});

describe("temple layering and motion (stylesheet)", () => {
  it("doesn't trap the gallery lightbox: no stacking context on the page's sections", () => {
    // A z-index on .main's children would cap the fixed lightbox (z 60) under the petals and mute button.
    expect(rule(".main")).not.toBe("");
    expect(rule(".main")).not.toMatch(/z-index/);
    // The paper grain is a background layer of .main itself: behind the content, never over it.
    expect(rule(".main")).toMatch(/background:\s*\$grain-faint,/);
    expect(rule(".main")).not.toMatch(/::(before|after)/);
    // The unlock fade must not keep filling once done: a lingering transform/opacity animation keeps
    // the gate wrapper (around the gallery) a stacking context, trapping the lightbox again.
    expect(rule(".gateOpen")).toMatch(/animation:/);
    expect(rule(".gateOpen")).not.toMatch(/\b(both|forwards)\b/);
  });

  it("glows the seal with opacity rather than a repainting filter, and stops once it opens or under reduced motion", () => {
    const start = scss.indexOf("@keyframes sealGlow");
    const keyframes = scss.slice(start, scss.indexOf("\n}", start) + 2);
    expect(keyframes).toMatch(/opacity/);
    expect(keyframes).not.toMatch(/filter/);
    expect(rule('.envelope[data-open="true"]')).toMatch(/\.seal::after\s*\{[^}]*animation:\s*none/);
    expect(rule("@media (prefers-reduced-motion: reduce)")).toMatch(/\.seal::after[^{]*\{[^}]*animation:\s*none/);
  });
});

describe("temple multi-day dates", () => {
  const cardValues = (el) => [...el.querySelectorAll('[data-part="value"]')].map((v) => v.textContent);
  const range = { mainDate: "2026-12-11", mainDateEnd: "2026-12-12" };

  it("shows 11–12 on the cards and the range sentence when the end date is valid", () => {
    const { container } = guest(build({ language: "en", ...range }));
    const std = section(container, "saveTheDate");
    expect(cardValues(std)).toEqual(["Dec", "11–12", "2026"]);
    fireEvent.click(within(std).getByRole("button", { name: "Reveal" }));
    expect(std).toHaveTextContent("Friday 11 – Saturday 12 December 2026");
  });

  it("shows a plain day when the end date is absent or invalid", () => {
    for (const mainDateEnd of [undefined, "2026-12-11", "2026-12-25"]) {
      const { container, unmount } = guest(build({ language: "en", mainDate: "2026-12-11", mainDateEnd }));
      const std = section(container, "saveTheDate");
      expect(cardValues(std)).toEqual(["Dec", "11", "2026"]);
      fireEvent.click(within(std).getByRole("button", { name: "Reveal" }));
      expect(std).toHaveTextContent("Friday, 11 December 2026");
      unmount();
    }
  });

  it("reads in Hindi", () => {
    const { container } = guest(build({ language: "hi", ...range }));
    const std = section(container, "saveTheDate");
    expect(cardValues(std)).toEqual(["दिसंबर", "11–12", "2026"]);
    fireEvent.click(within(std).getByRole("button", { name: "दिखाएँ" }));
    expect(std).toHaveTextContent("शुक्रवार 11 – शनिवार 12 दिसंबर 2026");
  });

  it("keeps the date out of the envelope letter", () => {
    guest(build({ language: "en", ...range }));
    const letter = document.querySelector('[data-part="letter"]');
    expect(letter.textContent).not.toMatch(/11|Dec|2026/);
  });
});
