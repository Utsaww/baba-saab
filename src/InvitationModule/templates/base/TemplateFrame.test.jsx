import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InvitationRenderer from "../../InvitationRenderer";
import { parseInvitation } from "../../schema/invitation";
import { getTemplate } from "../registry";
import TemplateFrame from "./TemplateFrame";

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

describe("TemplateFrame sections", () => {
  it("lets a template replace one section component and keeps the rest", () => {
    const Venue = () => <div data-section="venue">Custom venue</div>;
    const { container } = render(<TemplateFrame inv={invitation} ctx={{ skipOpening: true }} s={{}} Opening={() => null} sections={{ venue: Venue }} />);
    expect(screen.getByText("Custom venue")).toBeInTheDocument();
    expect(container.querySelector('[data-section="couple"]')).not.toBeNull();
  });

  it("leaves out sections the template's cover already shows", () => {
    const { container } = render(
      <TemplateFrame inv={invitation} ctx={{ skipOpening: true }} s={{}} Opening={() => null} coverSections={["invocation", "couple"]} />,
    );
    expect(container.querySelector('[data-section="invocation"]')).toBeNull();
    expect(container.querySelector('[data-section="couple"]')).toBeNull();
    expect(container.querySelector('[data-section="saveTheDate"]')).not.toBeNull();
  });
});
