import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import useMusic from "./useMusic";
import MuteButton from "./MuteButton";

const ACTIVATION_EVENTS = ["click", "touchend", "keydown"];

// Models the browser autoplay policy (iOS Safari is the strictest): play() is only allowed while a
// user-activation event (click, touchend, keydown) is being dispatched, or on an element that was
// already started during one. pointerdown/pointermove/touchmove/wheel are not activations on touch devices.
let activation = false;
let suppressActivation = false;
const startActivation = () => {
  activation = !suppressActivation;
};
const endActivation = () => {
  activation = false;
};

beforeEach(() => {
  activation = false;
  for (const type of ACTIVATION_EVENTS) {
    window.addEventListener(type, startActivation, true);
    window.addEventListener(type, endActivation);
  }
});

afterEach(() => {
  for (const type of ACTIVATION_EVENTS) {
    window.removeEventListener(type, startActivation, true);
    window.removeEventListener(type, endActivation);
  }
  vi.restoreAllMocks();
});

// holdFirst: the first play() starts the element but its promise only settles on release().
function stubMedia({ holdFirst = false } = {}) {
  const proto = window.HTMLMediaElement.prototype;
  const calls = [];
  let settle = () => {};
  const play = vi.spyOn(proto, "play").mockImplementation(function play() {
    calls.push({ muted: this.muted, activation });
    if (!activation && !this.unlocked) return Promise.reject(new Error("NotAllowedError"));
    this.unlocked = true;
    if (this.paused) {
      Object.defineProperty(this, "paused", { value: false, configurable: true });
      this.dispatchEvent(new Event("play"));
    }
    if (holdFirst && calls.length === 1) {
      return new Promise((resolve, reject) => {
        settle = (ok) => (ok ? resolve() : reject(new Error("AbortError")));
      });
    }
    return Promise.resolve();
  });
  const pause = vi.spyOn(proto, "pause").mockImplementation(function pause() {
    if (this.paused) return;
    Object.defineProperty(this, "paused", { value: true, configurable: true });
    this.dispatchEvent(new Event("pause"));
  });
  return { play, pause, calls, release: (ok = true) => settle(ok) };
}

const SONG = "https://cdn.example.com/song.mp3";
let music;
function Harness({ src = SONG }) {
  music = useMusic(src);
  return (
    <>
      <p>Cover</p>
      <MuteButton playing={music.playing} onToggle={music.toggle} />
    </>
  );
}

const playLabel = () => screen.getByRole("button", { name: /music/ }).getAttribute("aria-label");
const flush = () => act(async () => {});
const toggleButton = () => screen.getByRole("button", { name: /music/ });

// A touchend that does not grant activation, e.g. the end of a pan or a cancelled touch.
function touchEndWithoutActivation(target) {
  suppressActivation = true;
  try {
    fireEvent.touchEnd(target);
  } finally {
    suppressActivation = false;
  }
}

// play() outside any user activation, like Royal's scratch (pointermove) or Floral's swipe (touchmove).
async function playOutsideGesture() {
  await act(async () => {
    music.play();
  });
}

describe("useMusic", () => {
  it("starts music on the first tap of the music button after autoplay was blocked", async () => {
    stubMedia();
    render(<Harness />);
    await playOutsideGesture();
    expect(playLabel()).toBe("Play music");
    const toggle = screen.getByRole("button", { name: "Play music" });
    await act(async () => {
      fireEvent.pointerDown(toggle);
      fireEvent.touchEnd(toggle);
      fireEvent.click(toggle);
    });
    expect(playLabel()).toBe("Pause music");
  });

  it("retries a blocked play on the next touchend", async () => {
    stubMedia();
    render(<Harness />);
    await playOutsideGesture();
    expect(playLabel()).toBe("Play music");
    await act(async () => fireEvent.touchEnd(document.body));
    expect(playLabel()).toBe("Pause music");
  });

  it("retries a blocked play on the next click", async () => {
    stubMedia();
    render(<Harness />);
    await playOutsideGesture();
    await act(async () => fireEvent.click(screen.getByText("Cover")));
    expect(playLabel()).toBe("Pause music");
  });

  it("does not retry on pointerdown alone, which is not an activation on touch devices", async () => {
    const { play } = stubMedia();
    render(<Harness />);
    await playOutsideGesture();
    await act(async () => fireEvent.pointerDown(document.body));
    expect(play).toHaveBeenCalledTimes(1);
    expect(playLabel()).toBe("Play music");
  });

  it("leaves a touch on the music button to the toggle instead of retrying", async () => {
    const { play } = stubMedia();
    render(<Harness />);
    await playOutsideGesture();
    await act(async () => fireEvent.touchEnd(screen.getByRole("button", { name: "Play music" })));
    expect(play).toHaveBeenCalledTimes(1);
    expect(playLabel()).toBe("Play music");
  });

  it("primes audio silently on the first touch so a later delayed play() is allowed", async () => {
    const { play, pause, calls } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.touchEnd(screen.getByText("Cover")));
    expect(play).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual({ muted: true, activation: true });
    expect(pause).toHaveBeenCalledTimes(1);
    const el = play.mock.contexts[0];
    expect(el.muted).toBe(false);
    expect(el.currentTime).toBe(0);
    expect(playLabel()).toBe("Play music");

    // Temple's envelope reveals 900 ms after the tap, outside the gesture.
    await playOutsideGesture();
    expect(play).toHaveBeenCalledTimes(2);
    expect(calls[1]).toEqual({ muted: false, activation: false });
    expect(playLabel()).toBe("Pause music");
  });

  it("only primes once", async () => {
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.touchEnd(document.body));
    await act(async () => fireEvent.click(document.body));
    await act(async () => fireEvent.keyDown(document.body, { key: "a" }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("keeps playing unmuted when play() is requested while priming is in flight", async () => {
    const { play, release } = stubMedia({ holdFirst: true });
    render(<Harness />);
    await act(async () => fireEvent.touchEnd(document.body));
    expect(play).toHaveBeenCalledTimes(1);
    expect(playLabel()).toBe("Play music");

    await act(async () => {
      music.play();
    });
    await act(async () => release());
    await flush();

    const el = play.mock.contexts[0];
    expect(el.paused).toBe(false);
    expect(el.muted).toBe(false);
    expect(playLabel()).toBe("Pause music");
  });

  it("keeps trying to prime until a touch really is an activation", async () => {
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => touchEndWithoutActivation(document.body));
    expect(play).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.touchEnd(document.body));
    expect(play).toHaveBeenCalledTimes(2);
    expect(playLabel()).toBe("Play music");

    await playOutsideGesture();
    expect(playLabel()).toBe("Pause music");
    expect(play.mock.contexts[2].muted).toBe(false);
  });

  it("does not restart music at the reveal after the guest turned it off", async () => {
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Pause music");
    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Play music");
    const calls = play.mock.calls.length;

    await playOutsideGesture();
    expect(play).toHaveBeenCalledTimes(calls);
    expect(playLabel()).toBe("Play music");

    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Pause music");
  });

  it("honours the last toggle made while priming is in flight", async () => {
    const { play, release } = stubMedia({ holdFirst: true });
    render(<Harness />);
    await act(async () => fireEvent.touchEnd(document.body));
    const el = play.mock.contexts[0];
    await act(async () => fireEvent.click(toggleButton())); // on
    await act(async () => fireEvent.click(toggleButton())); // off again
    await act(async () => release());
    await flush();
    expect(el.paused).toBe(true);
    expect(el.muted).toBe(false);
    expect(playLabel()).toBe("Play music");
  });

  it("plays unmuted when the guest turns music on while priming is in flight", async () => {
    const { play, release } = stubMedia({ holdFirst: true });
    render(<Harness />);
    await act(async () => fireEvent.touchEnd(document.body));
    const el = play.mock.contexts[0];
    await act(async () => fireEvent.click(toggleButton()));
    await act(async () => release());
    await flush();
    expect(el.paused).toBe(false);
    expect(el.muted).toBe(false);
    expect(playLabel()).toBe("Pause music");
  });

  it("drops the old track's pending retry when the song changes", async () => {
    const { play } = stubMedia();
    const { rerender } = render(<Harness />);
    await playOutsideGesture();
    const old = play.mock.contexts[0];
    rerender(<Harness src="https://cdn.example.com/other.mp3" />);
    const before = play.mock.calls.length;
    await act(async () => fireEvent.touchEnd(document.body));
    expect(play.mock.contexts.slice(before)).not.toContain(old);
  });

  it("ignores a prime from the old track that settles after the song changed", async () => {
    const { play, release } = stubMedia({ holdFirst: true });
    const { rerender } = render(<Harness />);
    await act(async () => fireEvent.touchEnd(document.body));
    const old = play.mock.contexts[0];
    rerender(<Harness src="https://cdn.example.com/other.mp3" />);
    await playOutsideGesture(); // new track blocked: retry armed on the new element
    await act(async () => release(false)); // the old prime is aborted
    const before = play.mock.calls.length;
    await act(async () => fireEvent.touchEnd(document.body));
    const later = play.mock.contexts.slice(before);
    expect(later).not.toContain(old);
    expect(later.length).toBeGreaterThan(0);
    expect(playLabel()).toBe("Pause music");
  });

  it("removes every window listener it added when unmounted", async () => {
    stubMedia();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Harness />);
    await playOutsideGesture();
    const isCapture = (o) => o === true || Boolean(o?.capture);
    const added = add.mock.calls.filter(([type]) => ACTIVATION_EVENTS.includes(type) || type === "pointerdown");
    expect(added.length).toBeGreaterThan(0);
    unmount();
    for (const call of added) {
      const match = remove.mock.calls.find(([t, fn, o]) => t === call[0] && fn === call[1] && isCapture(o) === isCapture(call[2]));
      expect(match, `${call[0]} listener left on window`).toBeTruthy();
    }
  });
});

describe("useMusic fades and the remembered mute", () => {
  const TIMERS = { toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] };
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("fades music in from silence to a gentle volume over about 1.5 seconds", async () => {
    vi.useFakeTimers(TIMERS);
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    const el = play.mock.contexts[0];
    expect(el.volume).toBe(0);
    await act(async () => vi.advanceTimersByTime(750));
    expect(el.volume).toBeGreaterThan(0.15);
    expect(el.volume).toBeLessThan(0.3);
    await act(async () => vi.advanceTimersByTime(800));
    expect(el.volume).toBeCloseTo(0.45, 5);
  });

  it("fades in when the reveal starts the music", async () => {
    vi.useFakeTimers(TIMERS);
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.touchEnd(screen.getByText("Cover"))); // primes silently
    await playOutsideGesture();
    const el = play.mock.contexts[0];
    expect(playLabel()).toBe("Pause music");
    expect(el.volume).toBe(0);
    await act(async () => vi.advanceTimersByTime(1600));
    expect(el.volume).toBeCloseTo(0.45, 5);
  });

  it("fades out quickly and then pauses when the guest turns music off", async () => {
    vi.useFakeTimers(TIMERS);
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    await act(async () => vi.advanceTimersByTime(1600));
    const el = play.mock.contexts[0];
    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Play music");
    expect(el.paused).toBe(false);
    await act(async () => vi.advanceTimersByTime(200));
    expect(el.volume).toBeGreaterThan(0);
    expect(el.volume).toBeLessThan(0.45);
    expect(el.paused).toBe(false);
    await act(async () => vi.advanceTimersByTime(250));
    expect(el.paused).toBe(true);
    expect(el.volume).toBe(0);
  });

  it("keeps playing and fades back in when turned on again during the fade-out", async () => {
    vi.useFakeTimers(TIMERS);
    const { play } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    await act(async () => vi.advanceTimersByTime(1600));
    const el = play.mock.contexts[0];
    await act(async () => fireEvent.click(toggleButton())); // off
    await act(async () => vi.advanceTimersByTime(200));
    await act(async () => fireEvent.click(toggleButton())); // on again
    expect(playLabel()).toBe("Pause music");
    await act(async () => vi.advanceTimersByTime(2000));
    expect(el.paused).toBe(false);
    expect(el.volume).toBeCloseTo(0.45, 5);
  });

  it("sets the volume straight away under reduced motion", async () => {
    vi.stubGlobal("matchMedia", (query) => ({ matches: query.includes("reduce"), media: query }));
    const { play, pause } = stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    expect(play.mock.contexts[0].volume).toBeCloseTo(0.45, 5);
    await act(async () => fireEvent.click(toggleButton()));
    expect(pause).toHaveBeenCalled();
  });

  it("remembers on this device that the guest turned music off", async () => {
    const { play } = stubMedia();
    const { unmount } = render(<Harness />);
    await act(async () => fireEvent.click(toggleButton())); // on
    await act(async () => fireEvent.click(toggleButton())); // off
    expect(localStorage.getItem("music:muted")).toBe("1");
    unmount();

    render(<Harness />);
    expect(playLabel()).toBe("Play music");
    const before = play.mock.calls.length;
    await playOutsideGesture(); // the reveal
    expect(play).toHaveBeenCalledTimes(before);
    expect(playLabel()).toBe("Play music");

    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Pause music");
    expect(localStorage.getItem("music:muted")).toBeNull();
  });

  it("still plays and toggles when the device refuses storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    stubMedia();
    render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Pause music");
    await act(async () => fireEvent.click(toggleButton()));
    expect(playLabel()).toBe("Play music");
  });

  it("stops fading when unmounted", async () => {
    vi.useFakeTimers(TIMERS);
    stubMedia();
    const { unmount } = render(<Harness />);
    await act(async () => fireEvent.click(toggleButton()));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
