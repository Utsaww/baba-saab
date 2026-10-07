import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuideBanner from "./GuideBanner";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("GuideBanner", () => {
  it("links to the guide until dismissed, and stays dismissed", async () => {
    const { unmount } = render(<GuideBanner storageKey="guide:u-1" />);
    expect(await screen.findByRole("link", { name: /read the 5-minute guide/i })).toHaveAttribute("href", "/admin/help");

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
    unmount();

    render(<GuideBanner storageKey="guide:u-1" />);
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });

  it("is per staff member", async () => {
    localStorage.setItem("guide:u-1", "dismissed");
    render(<GuideBanner storageKey="guide:u-2" />);
    expect(await screen.findByRole("link", { name: /guide/i })).toBeInTheDocument();
  });

  it("still works when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<GuideBanner storageKey="guide:u-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });
});
