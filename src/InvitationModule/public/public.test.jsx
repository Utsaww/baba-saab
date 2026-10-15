import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotAvailable from "./NotAvailable";
import PreviewBanner from "./PreviewBanner";

describe("PreviewBanner", () => {
  it("says it is a preview", () => {
    render(<PreviewBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("Preview — not published yet");
  });
});

describe("NotAvailable", () => {
  it("shows the calm message and nothing else about the invitation", () => {
    render(<NotAvailable />);
    expect(screen.getByRole("heading")).toHaveTextContent("This invitation is no longer available");
  });
});
