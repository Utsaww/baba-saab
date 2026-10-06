import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import Countdown from "./Countdown";

describe("<Countdown>", () => {
  it("shows the remaining days and hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-02T13:30:00Z"));
    render(<Countdown target={Date.parse("2026-12-04T13:30:00Z")} lang="en" />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("timer")).toHaveTextContent("02Days00Hours00Minutes00Seconds");
  });
  it("shows a message instead of negative numbers after the date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-05T00:00:00Z"));
    render(<Countdown target={Date.parse("2026-12-04T13:30:00Z")} lang="en" />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByText("The celebrations have begun!")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
