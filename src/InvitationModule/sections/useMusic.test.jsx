import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import useMusic from "./useMusic";
import MuteButton from "./MuteButton";

// Media element whose paused state follows play()/pause(); the first play() is refused like a blocked autoplay.
function stubMedia() {
  let refusals = 1;
  const proto = window.HTMLMediaElement.prototype;
  const play = vi.spyOn(proto, "play").mockImplementation(function play() {
    if (refusals > 0) {
      refusals -= 1;
      return Promise.reject(new Error("NotAllowedError"));
    }
    Object.defineProperty(this, "paused", { value: false, configurable: true });
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  const pause = vi.spyOn(proto, "pause").mockImplementation(function pause() {
    Object.defineProperty(this, "paused", { value: true, configurable: true });
    this.dispatchEvent(new Event("pause"));
  });
  return { play, pause };
}

function Harness() {
  const music = useMusic("https://cdn.example.com/song.mp3");
  return (
    <>
      <button type="button" onClick={music.play}>
        Open
      </button>
      <MuteButton playing={music.playing} onToggle={music.toggle} />
    </>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useMusic", () => {
  it("starts music on the first tap of the music button after autoplay was blocked", async () => {
    stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(screen.getByText("Open")));
    const toggle = screen.getByRole("button", { name: "Play music" });
    await act(async () => {
      fireEvent.pointerDown(toggle);
      fireEvent.click(toggle);
    });
    expect(screen.getByRole("button", { name: "Pause music" })).toBeInTheDocument();
  });

  it("retries on the next tap elsewhere on the page", async () => {
    stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(screen.getByText("Open")));
    await act(async () => fireEvent.pointerDown(document.body));
    expect(screen.getByRole("button", { name: "Pause music" })).toBeInTheDocument();
  });
});
