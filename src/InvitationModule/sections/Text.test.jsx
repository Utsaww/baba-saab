import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import T from "./Text";

describe("<T>", () => {
  it("renders one language", () => {
    const { container } = render(<T v={{ en: "Venue", hi: "स्थल" }} lang="en" />);
    expect(container.textContent).toBe("Venue");
  });
  it("marks Hindi text with lang=hi", () => {
    const { container } = render(<T v={{ en: "Venue", hi: "स्थल" }} lang="hi" as="p" />);
    expect(container.querySelector("p")).toHaveAttribute("lang", "hi");
  });
  it("renders both languages with Hindi on its own line", () => {
    const { container } = render(<T v={{ en: "Venue", hi: "स्थल" }} lang="both" />);
    expect(container.textContent).toBe("Venueस्थल");
    expect(container.querySelector(".hiLine")).toHaveAttribute("lang", "hi");
  });
  it("renders nothing for empty text", () => {
    const { container } = render(<T v={{ en: " " }} lang="both" />);
    expect(container).toBeEmptyDOMElement();
  });
});
