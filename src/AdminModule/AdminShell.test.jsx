import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn() }));

import AdminShell, { navFor } from "./AdminShell";

describe("navFor", () => {
  it("shows Staff to the owner only", () => {
    expect(navFor({ isOwner: true }).map((i) => i.label)).toEqual(["Dashboard", "Templates", "Staff", "Help"]);
    expect(navFor({ isOwner: false }).map((i) => i.label)).toEqual(["Dashboard", "Templates", "Help"]);
  });
});

describe("AdminShell", () => {
  it("shows who is signed in and a sign-out button", () => {
    render(
      <AdminShell email="priya@example.com" isOwner={false}>
        <p>page body</p>
      </AdminShell>,
    );
    expect(screen.getByText("priya@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Staff" })).not.toBeInTheDocument();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });
});
