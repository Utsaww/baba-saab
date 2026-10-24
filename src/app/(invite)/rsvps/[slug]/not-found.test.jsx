import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FamilyNotFound from "./not-found";

describe("family not found", () => {
  it("says the link is no longer available", () => {
    render(<FamilyNotFound />);
    expect(screen.getByText("This link is no longer available")).toBeTruthy();
  });
});
