import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { getTemplate } from "./registry";

const build = (id, mainDateEnd) =>
  parseInvitation({ ...getTemplate(id).sample, language: "en", mainDate: "2026-12-11", mainDateEnd });
const text = (inv) => render(<InvitationRenderer invitation={inv} />).container.textContent;

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
