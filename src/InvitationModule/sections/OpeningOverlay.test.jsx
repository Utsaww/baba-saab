import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import OpeningOverlay, { CLOSE_MS } from "./OpeningOverlay";

describe("<OpeningOverlay>", () => {
  it("locks scrolling, calls onOpen once, then unmounts", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(
      <OpeningOverlay className="o" closingClassName="closing" onOpen={onOpen}>
        {(open) => <button onClick={open}>Open</button>}
      </OpeningOverlay>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(screen.getByText("Open"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveClass("closing");
    act(() => vi.advanceTimersByTime(CLOSE_MS));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
