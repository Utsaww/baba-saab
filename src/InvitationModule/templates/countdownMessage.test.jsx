import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { TEMPLATES } from "./registry";

const MSG = "See you in Jaipur!";
const build = (template, custom, theme = {}) =>
  parseInvitation({ ...template.sample, language: "en", mainDate: "2099-01-01", theme: { ...template.sample.theme, ...theme }, custom });
const section = (inv) => render(<InvitationRenderer invitation={inv} />).container.querySelector('[data-section="countdown"]');
const message = { mode: "message", message: { en: MSG } };

describe.each(TEMPLATES)("countdown message in $id", (template) => {
  it("shows the message with no units and no heading", () => {
    const el = section(build(template, { countdown: message }));
    expect(el.textContent).toBe(MSG);
    expect(el.querySelector("h2")).toBeNull();
  });

  it("shows the heading only when staff set one", () => {
    const el = section(build(template, { countdown: message, text: { countdown: { en: "Almost there" } } }));
    expect(el.querySelector("h2").textContent).toBe("Almost there");
    expect(el.textContent).toContain(MSG);
  });

  it("falls back to the countdown when the message is empty", () => {
    const el = section(build(template, { countdown: { mode: "message", message: {} } }));
    expect(el.querySelector('[role="timer"]')).not.toBeNull();
  });

  it("is gone when the section is hidden", () => {
    expect(section(build(template, { countdown: message }, { hidden: ["countdown"] }))).toBeNull();
  });
});
