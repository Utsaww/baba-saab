import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn() }));

import { signOut } from "aws-amplify/auth";
import SignOutButton from "./SignOutButton";

afterEach(() => vi.clearAllMocks());

describe("SignOutButton", () => {
  it("does not sign out when something cancels admin:before-signout", () => {
    const cancel = (event) => event.preventDefault();
    window.addEventListener("admin:before-signout", cancel);
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    window.removeEventListener("admin:before-signout", cancel);
    expect(signOut).not.toHaveBeenCalled();
  });
});
