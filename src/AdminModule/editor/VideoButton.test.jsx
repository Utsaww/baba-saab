import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import VideoButton from "./VideoButton";

const UNREACHABLE = "Couldn't reach the video service. Check your connection and try again.";
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
    expect(screen.getByRole("button", { name: "Download MP4" })).toBeInTheDocument();
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

  it("the Download MP4 link is a button that re-checks and goes to the fresh url", async () => {
    const check = vi.fn().mockResolvedValueOnce(ok("ready", { url: "old" })).mockResolvedValue(ok("ready", { url: "fresh" }));
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<VideoButton id="inv-1" check={check} />);
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Download MP4" })));
    expect(check).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenCalledWith("fresh");
    vi.unstubAllGlobals();
  });

  it("a press on Download MP4 shows the new state when no longer ready", async () => {
    const check = vi.fn().mockResolvedValueOnce(ok("ready", { url: "old" })).mockResolvedValue(ok("none"));
    render(<VideoButton id="inv-1" check={check} />);
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Download MP4" })));
    expect(screen.getByRole("button", { name: "Download video" })).toBeInTheDocument();
  });

  it("a rejecting check on mount shows the message and Try again", async () => {
    render(<VideoButton id="inv-1" check={vi.fn().mockRejectedValue(new Error("offline"))} />);
    await act(async () => {});
    expect(screen.getByText(UNREACHABLE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("a rejecting poll stops polling", async () => {
    const check = vi.fn().mockResolvedValueOnce(ok("making")).mockRejectedValue(new Error("offline"));
    render(<VideoButton id="inv-1" check={check} pollMs={1000} />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(1000));
    expect(screen.getByText(UNREACHABLE)).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("a rejecting make shows the message", async () => {
    render(<VideoButton id="inv-1" check={vi.fn(async () => ok("none"))} make={vi.fn().mockRejectedValue(new Error("offline"))} />);
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Download video" })));
    expect(screen.getByText(UNREACHABLE)).toBeInTheDocument();
  });

  it("stops polling once the status leaves making", async () => {
    const check = vi.fn().mockResolvedValueOnce(ok("making")).mockResolvedValue(ok("failed"));
    render(<VideoButton id="inv-1" check={check} pollMs={1000} />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(1000));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("does not start the next poll until the previous check settles", async () => {
    let finish;
    const check = vi.fn().mockResolvedValueOnce(ok("making")).mockImplementationOnce(() => new Promise((r) => (finish = r)));
    render(<VideoButton id="inv-1" check={check} pollMs={1000} />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(5000));
    expect(check).toHaveBeenCalledTimes(2);
    check.mockResolvedValue(ok("ready", { url: "u" }));
    await act(async () => finish(ok("making")));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(check).toHaveBeenCalledTimes(3);
  });

  it("treats an unknown status as failed", async () => {
    render(<VideoButton id="inv-1" check={vi.fn(async () => ok("weird"))} />);
    await act(async () => {});
    expect(screen.getByText("Couldn't make the video. Try again.")).toBeInTheDocument();
  });

  it("unmounting with a check in flight does nothing afterwards", async () => {
    let finish;
    const check = vi.fn(() => new Promise((r) => (finish = r)));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<VideoButton id="inv-1" check={check} pollMs={1000} />);
    unmount();
    await act(async () => finish(ok("making")));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(check).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
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
