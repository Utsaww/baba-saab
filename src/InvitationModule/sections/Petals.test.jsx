import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import Petals from "./Petals";

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fills: [],
    set fillStyle(v) {
      this.fills.push(v);
    },
    set globalAlpha(_v) {},
  };
}

let frames;
let nextId;
let ctx;
let motion;
function setup({ reduced = false } = {}) {
  frames = new Map();
  nextId = 1;
  ctx = fakeContext();
  // A reduced-motion MediaQueryList whose preference the test can flip.
  motion = {
    matches: reduced,
    listeners: new Set(),
    addEventListener: vi.fn((type, fn) => motion.listeners.add(fn)),
    removeEventListener: vi.fn((type, fn) => motion.listeners.delete(fn)),
  };
  vi.stubGlobal("matchMedia", (query) => (query.includes("reduce") ? motion : { matches: false, media: query }));
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((cb) => {
      const id = nextId++;
      frames.set(id, cb);
      return id;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id) => frames.delete(id)),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx);
}
function runFrame(time) {
  const pending = [...frames.entries()];
  frames.clear();
  for (const [, cb] of pending) cb(time);
}
function setReduced(matches) {
  motion.matches = matches;
  for (const fn of [...motion.listeners]) fn({ matches });
}
function setHidden(hidden) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => setup());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.hidden;
});

describe("Petals", () => {
  it("renders nothing on the server", () => {
    expect(renderToString(<Petals active />)).toBe("");
  });

  it("waits for the opening before starting", () => {
    const { container, rerender } = render(<Petals active={false} />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    rerender(<Petals active />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it("draws a small number of petals each frame", () => {
    render(<Petals active count={16} />);
    act(() => runFrame(16));
    act(() => runFrame(32));
    expect(ctx.ellipse).toHaveBeenCalledTimes(32);
  });

  it("does not run under reduced motion", () => {
    setup({ reduced: true });
    const { container } = render(<Petals active />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("pauses while the page is hidden and resumes when it is shown", () => {
    render(<Petals active />);
    expect(frames.size).toBe(1);
    act(() => setHidden(true));
    expect(frames.size).toBe(0);
    act(() => setHidden(false));
    expect(frames.size).toBe(1);
  });

  it("cancels its frame and removes its listeners on unmount", () => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<Petals active />);
    act(() => runFrame(16));
    const [lastId] = [...frames.keys()];
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(lastId);
    expect(frames.size).toBe(0);
    expect(removeWindow).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("does not start while the page is hidden at mount, and starts once it is shown", () => {
    setHidden(true);
    render(<Petals active />);
    expect(frames.size).toBe(0);
    act(() => setHidden(false));
    expect(frames.size).toBe(1);
  });

  it("stops when reduced motion is turned on mid-visit and resumes when it is turned off", () => {
    const { container } = render(<Petals active />);
    expect(frames.size).toBe(1);
    act(() => setReduced(true));
    expect(container.querySelector("canvas")).toBeNull();
    expect(frames.size).toBe(0);
    act(() => setReduced(false));
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(frames.size).toBe(1);
  });

  it("stops listening for the motion preference on unmount", () => {
    const { unmount } = render(<Petals active />);
    expect(motion.listeners.size).toBe(1);
    unmount();
    expect(motion.listeners.size).toBe(0);
  });

  it("re-reads the petal colour when it restarts, so a palette change shows", () => {
    const { container } = render(<Petals active />);
    act(() => runFrame(16));
    container.querySelector("canvas").style.setProperty("--petal", "#123456");
    act(() => setHidden(true));
    act(() => setHidden(false));
    act(() => runFrame(32));
    expect(ctx.fills.at(-1)).toBe("#123456");
  });

  it("alternates two petal colours when the page sets a second one", () => {
    const { container } = render(<Petals active count={4} />);
    const canvas = container.querySelector("canvas");
    canvas.style.setProperty("--petal", "#aa0000");
    canvas.style.setProperty("--petal-2", "#00bb00");
    act(() => setHidden(true));
    act(() => setHidden(false));
    ctx.fills.length = 0;
    act(() => runFrame(16));
    expect(new Set(ctx.fills)).toEqual(new Set(["#aa0000", "#00bb00"]));
  });

  it("uses the one colour for every petal when no second colour is set", () => {
    const { container } = render(<Petals active count={4} />);
    container.querySelector("canvas").style.setProperty("--petal", "#aa0000");
    act(() => setHidden(true));
    act(() => setHidden(false));
    ctx.fills.length = 0;
    act(() => runFrame(16));
    expect(new Set(ctx.fills)).toEqual(new Set(["#aa0000"]));
  });

  it("doesn't re-read styles on a resize that changes nothing", () => {
    render(<Petals active />);
    const styles = vi.spyOn(window, "getComputedStyle");
    act(() => window.dispatchEvent(new Event("resize")));
    expect(styles).not.toHaveBeenCalled();
  });

  it("resizes the canvas only when its size or pixel ratio changes", () => {
    render(<Petals active />);
    expect(ctx.setTransform).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(ctx.setTransform).toHaveBeenCalledTimes(1);
    const width = window.innerWidth;
    window.innerWidth = width + 40;
    act(() => window.dispatchEvent(new Event("resize")));
    window.innerWidth = width;
    expect(ctx.setTransform).toHaveBeenCalledTimes(2);
  });

  it("copes with a browser that has no 2D canvas", () => {
    HTMLCanvasElement.prototype.getContext.mockImplementation(() => null);
    const { container } = render(<Petals active />);
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
