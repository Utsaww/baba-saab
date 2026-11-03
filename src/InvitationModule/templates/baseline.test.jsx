import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { TEMPLATES, getTemplate } from "./registry";

// Safety net: existing invitations must render byte-identically. Do not update these snapshots.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T00:00:00+05:30"));
});
afterEach(() => vi.useRealTimers());

describe.each(TEMPLATES.map((t) => t.id))("baseline %s", (id) => {
  describe.each(["en", "hi", "both"])("%s", (language) => {
    const inv = () => parseInvitation({ ...getTemplate(id).sample, language });
    it("without opening", () => {
      const { container } = render(<InvitationRenderer invitation={inv()} ctx={{ skipOpening: true }} />);
      expect(container.innerHTML).toMatchSnapshot();
    });
    it("with opening", () => {
      const { container } = render(<InvitationRenderer invitation={inv()} />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });
});
