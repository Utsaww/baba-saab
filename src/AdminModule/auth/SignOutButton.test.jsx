import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

  it("waits for pending saves before signing out", async () => {
    let finish;
    const pending = new Promise((resolve) => (finish = resolve));
    const collect = (event) => event.detail.waitFor(pending);
    window.addEventListener("admin:before-signout", collect);
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await Promise.resolve();
    expect(signOut).not.toHaveBeenCalled();
    finish();
    vi.stubGlobal("location", { assign: vi.fn() });
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    window.removeEventListener("admin:before-signout", collect);
    vi.unstubAllGlobals();
  });
});
