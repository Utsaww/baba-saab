import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import FloralArch, { ARCH_BLOSSOMS, ARCH_LEAVES } from "./FloralArch";
import Emboss from "./Emboss";

describe("FloralArch", () => {
  it("renders the same markup every time, so server and client match", () => {
    expect(renderToString(<FloralArch />)).toBe(renderToString(<FloralArch />));
  });

  it("is a labelled image with two vines a side, blossoms, leaves and a top cluster", () => {
    const { container } = render(<FloralArch />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Floral arch");
    expect(svg).toHaveAttribute("viewBox", "0 0 360 150");
    expect(container.querySelectorAll('[data-part="vine"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-part="blossom"]')).toHaveLength(ARCH_BLOSSOMS);
    expect(container.querySelectorAll('[data-part="leaf"]')).toHaveLength(ARCH_LEAVES);
    // Five petals per blossom.
    for (const blossom of container.querySelectorAll('[data-part="blossom"]')) {
      expect(blossom.querySelectorAll("ellipse")).toHaveLength(5);
    }
  });

  it("takes a translated label", () => {
    const { container } = render(<FloralArch label="फूलों का तोरण" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", "फूलों का तोरण");
  });

  it("is symmetrical in count: the same number of blossoms climb each side", () => {
    const { container } = render(<FloralArch />);
    const sides = [...container.querySelectorAll('[data-part="blossom"]')].map((b) => b.dataset.side);
    expect(sides.filter((s) => s === "left")).toHaveLength(sides.filter((s) => s === "right").length);
    expect(sides.filter((s) => s === "top").length).toBeGreaterThanOrEqual(3);
  });
});

describe("Emboss", () => {
  it("renders the same markup every time", () => {
    expect(renderToString(<Emboss />)).toBe(renderToString(<Emboss />));
  });

  it("draws a hidden grid of jittered, rotated blossoms", () => {
    const { container } = render(<Emboss cols={6} rows={4} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    const blossoms = container.querySelectorAll('[data-part="blossom"]');
    expect(blossoms).toHaveLength(24);
    // Jittered and rotated: no two transforms are the same.
    const transforms = new Set([...blossoms].map((b) => b.getAttribute("transform")));
    expect(transforms.size).toBe(24);
    expect(svg.querySelectorAll("symbol ellipse")).toHaveLength(5);
  });

  it("gives each instance its own symbol id", () => {
    const { container } = render(
      <>
        <Emboss />
        <Emboss />
      </>,
    );
    const ids = [...container.querySelectorAll("symbol")].map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });
});
