import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteStaffForm from "./InviteStaffForm";

async function fillAndSend(name, email) {
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));
}

describe("InviteStaffForm", () => {
  it("sends the name and email, shows the result and clears the form", async () => {
    const inviteAction = vi.fn(async () => ({ ok: true, message: "Invitation emailed to neha@example.com." }));
    render(<InviteStaffForm inviteAction={inviteAction} />);

    await fillAndSend("Neha", "neha@example.com");

    expect(inviteAction).toHaveBeenCalledWith({ email: "neha@example.com", name: "Neha" });
    expect(await screen.findByRole("status")).toHaveTextContent("Invitation emailed to neha@example.com.");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("keeps what was typed when the invite fails", async () => {
    const inviteAction = vi.fn(async () => ({ ok: false, message: "neha@example.com already has a staff account." }));
    render(<InviteStaffForm inviteAction={inviteAction} />);

    await fillAndSend("Neha", "neha@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("already has a staff account");
    expect(screen.getByLabelText("Email")).toHaveValue("neha@example.com");
  });

  it("explains a lost connection", async () => {
    const inviteAction = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<InviteStaffForm inviteAction={inviteAction} />);

    await fillAndSend("Neha", "neha@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server");
  });
});
