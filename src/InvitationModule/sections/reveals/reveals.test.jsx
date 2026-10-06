import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TapReveal from "./TapReveal";
import EnvelopeReveal, { ENVELOPE_MS } from "./EnvelopeReveal";
import ScrollReveal from "./ScrollReveal";
import ScratchReveal from "./ScratchReveal";

describe("reveals", () => {
  it("TapReveal reveals on click", () => {
    const onReveal = vi.fn();
    render(<TapReveal onReveal={onReveal}>Tap</TapReveal>);
    fireEvent.click(screen.getByRole("button"));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("EnvelopeReveal opens, then reveals once after the animation", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    render(<EnvelopeReveal onReveal={onReveal} label="Open the invitation" />);
    const button = screen.getByRole("button", { name: "Open the invitation" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute("data-open", "true");
    expect(onReveal).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(ENVELOPE_MS));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("ScrollReveal reveals on downward wheel or click, only once", () => {
    const onReveal = vi.fn();
    render(<ScrollReveal onReveal={onReveal}>Scroll</ScrollReveal>);
    fireEvent.wheel(window, { deltaY: -20 });
    expect(onReveal).not.toHaveBeenCalled();
    fireEvent.wheel(window, { deltaY: 40 });
    fireEvent.click(screen.getByRole("button"));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("ScratchReveal can be revealed with the fallback button", () => {
    const onReveal = vi.fn();
    render(
      <ScratchReveal onReveal={onReveal} hint="or tap here">
        <p>04 · 12 · 2026</p>
      </ScratchReveal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "or tap here" }));
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("04 · 12 · 2026")).toBeVisible();
  });
});
