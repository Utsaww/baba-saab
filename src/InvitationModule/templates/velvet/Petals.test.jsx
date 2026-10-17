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
    set fillStyle(_v) {},
    set globalAlpha(_v) {},
  };
}

let frames;
let nextId;
let ctx;
function setup({ reduced = false } = {}) {
  frames = new Map();
  nextId = 1;
  ctx = fakeContext();
  vi.stubGlobal("matchMedia", (query) => ({ matches: reduced && query.includes("reduce"), media: query }));
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

  it("copes with a browser that has no 2D canvas", () => {
    HTMLCanvasElement.prototype.getContext.mockImplementation(() => null);
    const { container } = render(<Petals active />);
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
