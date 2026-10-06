import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import Gallery from "./Gallery";

const items = [
  { key: "https://x.test/1.jpg", caption: { en: "Engagement" } },
  { key: "https://x.test/2.jpg" },
  { key: "https://x.test/3.jpg" },
];

describe("<Gallery>", () => {
  it("opens the lightbox, wraps around, and closes with Escape", () => {
    render(<Gallery items={items} lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Open Engagement" }));
    const viewer = screen.getByRole("dialog", { name: "Photo viewer" });
    expect(within(viewer).getByRole("img")).toHaveAttribute("src", "https://x.test/1.jpg");
    fireEvent.click(within(viewer).getByRole("button", { name: "Previous photo" }));
    expect(within(viewer).getByRole("img")).toHaveAttribute("src", "https://x.test/3.jpg");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(viewer).getByRole("img")).toHaveAttribute("src", "https://x.test/1.jpg");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
