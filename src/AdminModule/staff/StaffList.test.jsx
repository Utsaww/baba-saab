import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffList from "./StaffList";

const members = [
  { username: "u-owner", email: "owner@example.com", name: "Ravi", status: "active", isOwner: true, createdAt: "2026-10-01T10:00:00.000Z" },
  { username: "u-amit", email: "amit@example.com", name: null, status: "invited", isOwner: false, createdAt: "2026-10-02T10:00:00.000Z" },
  { username: "u-zara", email: "zara@example.com", name: "Zara", status: "active", isOwner: false, createdAt: null },
];

function setup(overrides = {}) {
  const props = {
    members,
    currentUsername: "u-owner",
    inviteAction: vi.fn(async () => ({ ok: true, message: "Invitation emailed to amit@example.com." })),
    removeAction: vi.fn(async () => ({ ok: true, message: "Removed. They can no longer sign in." })),
    ...overrides,
  };
  render(<StaffList {...props} />);
  return props;
}

const row = (text) => screen.getByText(text).closest("li");

describe("StaffList", () => {
  it("shows each person with their status, and marks the owner and you", () => {
    setup();
    expect(within(row("Ravi (you)")).getByText("Owner")).toBeInTheDocument();
    expect(within(row("amit@example.com")).getByText("Invited · hasn't signed in yet")).toBeInTheDocument();
    expect(within(row("Zara")).getByText("Active")).toBeInTheDocument();
    expect(within(row("Zara")).getByText("zara@example.com")).toBeInTheDocument();
  });

  it("never offers to remove the owner or yourself", () => {
    setup();
    expect(within(row("Ravi (you)")).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(within(row("Zara")).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("resends a pending invitation", async () => {
    const { inviteAction } = setup();
    await userEvent.click(within(row("amit@example.com")).getByRole("button", { name: "Send invite again" }));
    expect(inviteAction).toHaveBeenCalledWith({ email: "amit@example.com", name: null });
    expect(await screen.findByRole("status")).toHaveTextContent("Invitation emailed to amit@example.com.");
    expect(within(row("Zara")).queryByRole("button", { name: "Send invite again" })).not.toBeInTheDocument();
  });

  it("asks before removing, and can be cancelled", async () => {
    const { removeAction } = setup();
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Remove" }));
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Cancel" }));
    expect(removeAction).not.toHaveBeenCalled();

    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Remove" }));
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Yes, remove" }));
    expect(removeAction).toHaveBeenCalledWith({ username: "u-zara" });
    expect(await screen.findByRole("status")).toHaveTextContent("Removed.");
  });

  it("shows a failed removal as an alert", async () => {
    setup({ removeAction: vi.fn(async () => ({ ok: false, message: "The owner account can't be removed." })) });
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Remove" }));
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Yes, remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The owner account can't be removed.");
  });
});
