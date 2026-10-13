import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayButton } from "./MusicPicker";

let play;
let pause;
beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("PlayButton", () => {
  it("shows Pause once playback has started, and Play again after pausing", async () => {
    render(<PlayButton src="/a.mp3" label="Song A" />);
    await userEvent.click(screen.getByRole("button", { name: "Play Song A" }));
    expect(await screen.findByRole("button", { name: "Pause Song A" })).toHaveTextContent("❚❚ Pause");
    await userEvent.click(screen.getByRole("button", { name: "Pause Song A" }));
    expect(screen.getByRole("button", { name: "Play Song A" })).toHaveTextContent("▶ Play");
  });

  it("stays on Play when the browser refuses to play", async () => {
    play.mockRejectedValue(new Error("NotAllowedError"));
    render(<PlayButton src="/a.mp3" label="Song A" />);
    await userEvent.click(screen.getByRole("button", { name: "Play Song A" }));
    expect(screen.getByRole("button", { name: "Play Song A" })).toHaveTextContent("▶ Play");
  });

  it("pauses the first button when a second one starts", async () => {
    render(
      <>
        <PlayButton src="/a.mp3" label="Song A" />
        <PlayButton src="/b.mp3" label="Song B" />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Play Song A" }));
    expect(await screen.findByRole("button", { name: "Pause Song A" })).toBeInTheDocument();
    pause.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Play Song B" }));
    expect(await screen.findByRole("button", { name: "Pause Song B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play Song A" })).toBeInTheDocument();
    expect(pause).toHaveBeenCalledTimes(1);
  });
});
