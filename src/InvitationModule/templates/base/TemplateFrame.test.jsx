import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InvitationRenderer from "../../InvitationRenderer";
import { parseInvitation } from "../../schema/invitation";
import { getTemplate } from "../registry";

const invitation = parseInvitation(getTemplate("royal").sample);

describe("TemplateFrame opening", () => {
  it("shows the opening cover to guests", () => {
    render(<InvitationRenderer invitation={invitation} />);
    expect(screen.getByRole("dialog", { name: "Invitation cover" })).toBeInTheDocument();
  });

  it("skips the opening cover in the editor preview", () => {
    render(<InvitationRenderer invitation={invitation} ctx={{ mode: "preview", skipOpening: true }} />);
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).not.toBeInTheDocument();
  });
});
