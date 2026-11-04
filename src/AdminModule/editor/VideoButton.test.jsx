import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import VideoButton from "./VideoButton";

const ok = (status, extra) => ({ ok: true, status, ...extra });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("VideoButton", () => {
  it("none → press → making → polls → ready shows Download MP4 link", async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(ok("none"))
      .mockResolvedValue(ok("ready", { url: "https://cdn/v.mp4", fileName: "v.mp4" }));
    const make = vi.fn(async () => ok("making"));
    render(<VideoButton id="inv-1" make={make} check={check} pollMs={1000} />);
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Download video" })));
    expect(make).toHaveBeenCalledWith({ id: "inv-1" });
    expect(screen.getByRole("button", { name: "Making video…" })).toBeDisabled();
    expect(screen.getByText("Takes 1–2 minutes. You can keep working.")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("link", { name: "Download MP4" })).toHaveAttribute("href", "https://cdn/v.mp4");
  });

  it("failed shows the message and Try again calls make", async () => {
    const make = vi.fn(async () => ok("making"));
    render(<VideoButton id="inv-1" make={make} check={vi.fn(async () => ok("failed"))} />);
    await act(async () => {});
    expect(screen.getByText("Couldn't make the video. Try again.")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(make).toHaveBeenCalledTimes(1);
  });

  it("shows an action error with Try again", async () => {
    render(<VideoButton id="inv-1" check={vi.fn(async () => ({ ok: false, message: "Only a live invitation can have a video." }))} />);
    await act(async () => {});
    expect(screen.getByText("Only a live invitation can have a video.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("ready with note shows the note", async () => {
    render(<VideoButton id="inv-1" check={vi.fn(async () => ok("ready", { url: "u", note: "Music was left out." }))} />);
    await act(async () => {});
    expect(screen.getByText("Music was left out.")).toBeInTheDocument();
  });

  it("stops polling on unmount", async () => {
    const check = vi.fn(async () => ok("making"));
    const { unmount } = render(<VideoButton id="inv-1" check={check} pollMs={1000} />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(1000));
    unmount();
    const calls = check.mock.calls.length;
    await act(async () => vi.advanceTimersByTime(5000));
    expect(check).toHaveBeenCalledTimes(calls);
  });
});
