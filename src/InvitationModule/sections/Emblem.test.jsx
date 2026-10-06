import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Emblem from "./Emblem";

describe("<Emblem>", () => {
  it("uses a short centre word that stays legible at small sizes", () => {
    render(<Emblem deity="ganesh" />);
    expect(screen.getByRole("img", { name: "Shri Ganeshaya Namah" })).toHaveTextContent(/^श्री गणेश$/);
  });
  it("renders nothing when no deity is chosen", () => {
    const { container } = render(<Emblem deity="none" />);
    expect(container).toBeEmptyDOMElement();
  });
});
