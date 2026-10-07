import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@aws-amplify/ui-react", () => ({
  Authenticator: ({ hideSignUp }) => <div data-testid="authenticator" data-hide-sign-up={String(hideSignUp)} />,
}));

import LoginPanel from "./LoginPanel";

describe("LoginPanel", () => {
  it("shows the sign-in form without a sign-up option", () => {
    render(<LoginPanel next="/admin" />);
    expect(screen.getByTestId("authenticator")).toHaveAttribute("data-hide-sign-up", "true");
  });

  it("explains a missing staff role instead of showing the form", () => {
    render(<LoginPanel next="/admin" error="no-access" />);
    expect(screen.queryByTestId("authenticator")).not.toBeInTheDocument();
    expect(screen.getByText(/doesn't have access to the admin area/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
