import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Film from "./Film";

describe("<Film>", () => {
  it("shows a YouTube thumbnail until tapped, then the player", () => {
    render(<Film film={{ type: "youtube", url: "https://youtu.be/abcdefghijk" }} title="The invitation film" />);
    expect(document.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "The invitation film" }));
    expect(screen.getByTitle("The invitation film")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0",
    );
  });
  it("renders nothing for an unusable link", () => {
    const { container } = render(<Film film={{ type: "youtube", url: "https://vimeo.com/1" }} title="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
