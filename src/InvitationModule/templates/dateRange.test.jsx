import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { getTemplate } from "./registry";

const build = (id, mainDateEnd, custom) =>
  parseInvitation({ ...getTemplate(id).sample, language: "en", mainDate: "2026-12-11", mainDateEnd, custom });
const text = (inv) => {
  const { container } = render(<InvitationRenderer invitation={inv} />);
  // Temple writes the short date only in its WhatsApp share message.
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  fireEvent.click(screen.getByRole("button", { name: "Share on WhatsApp", hidden: true }));
  const shared = decodeURIComponent(open.mock.calls[0][0]);
  open.mockRestore();
  return container.textContent + shared;
};

describe.each(["royal", "floral", "minimal", "velvet"])("two-day wedding in %s", (id) => {
  it("shows both days", () => {
    const t = text(build(id, "2026-12-12"));
    expect(t).toContain("11–12 · 12 · 2026");
    expect(t).toMatch(/Friday 11 – Saturday 12 December 2026/);
  });

  it("shows one day when there is no end date", () => {
    const t = text(build(id));
    expect(t).toContain("11 · 12 · 2026");
    expect(t).not.toContain("11–12");
  });
});

describe.each(["royal", "floral", "temple", "minimal", "velvet"])("date style in %s", (id) => {
  it("writes the date in the chosen style", () => {
    expect(text(build(id, "2026-12-12", { dateStyle: "ordinal" }))).toContain("11th & 12th Dec 2026");
  });

  it("keeps the classic date without a style", () => {
    expect(text(build(id, "2026-12-12"))).not.toContain("11th");
  });
});

describe.each(["royal", "floral", "temple", "minimal", "velvet"])("weekday style on save-the-date in %s", (id) => {
  const saveTheDate = (language) => {
    const inv = parseInvitation({ ...getTemplate(id).sample, language, mainDate: "2026-12-11", mainDateEnd: "2026-12-12", custom: { dateStyle: "weekday" } });
    return render(<InvitationRenderer invitation={inv} />).container.querySelector('[data-section="saveTheDate"]').textContent;
  };
  const count = (t, s) => t.split(s).length - 1;

  it("writes the long date once", () => {
    expect(count(saveTheDate("en"), "Friday 11 – Saturday 12 December 2026")).toBeLessThan(2);
    expect(count(saveTheDate("hi"), "शुक्रवार 11 – शनिवार 12 दिसंबर 2026")).toBeLessThan(2);
  });

  // Temple shows its long date only once the cards are scratched.
  it.skipIf(id === "temple")("keeps the Hindi line on a bilingual invitation", () => {
    const t = saveTheDate("both");
    expect(count(t, "Friday 11 – Saturday 12 December 2026")).toBeLessThan(2);
    expect(t).toContain("शुक्रवार 11 – शनिवार 12 दिसंबर 2026");
  });
});
