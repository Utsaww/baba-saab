import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import Sparkles, { SPARKLE_MS } from "./Sparkles";

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    set fillStyle(_v) {},
    set globalAlpha(_v) {},
    set shadowBlur(_v) {},
    set shadowColor(_v) {},
    set globalCompositeOperation(_v) {},
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
  const pending = [...frames.values()];
  frames.clear();
  for (const cb of pending) cb(time);
}

beforeEach(() => setup());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Sparkles", () => {
  it("renders nothing on the server", () => {
    expect(renderToString(<Sparkles active />)).toBe("");
  });

  it("waits until the envelope opens", () => {
    const { container, rerender } = render(<Sparkles active={false} />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    rerender(<Sparkles active />);
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it("draws gold glints from the envelope's mouth", () => {
    render(<Sparkles active />);
    act(() => runFrame(0));
    act(() => runFrame(400));
    expect(ctx.fill.mock.calls.length).toBeGreaterThan(10);
  });

  it("is short-lived: it stops asking for frames once the burst is over", () => {
    const { container } = render(<Sparkles active />);
    act(() => runFrame(0));
    act(() => runFrame(SPARKLE_MS / 2));
    expect(frames.size).toBe(1);
    act(() => runFrame(SPARKLE_MS + 50));
    expect(frames.size).toBe(0);
    expect(ctx.clearRect).toHaveBeenCalled();
    // The spent canvas is removed too.
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("does nothing under reduced motion", () => {
    setup({ reduced: true });
    const { container } = render(<Sparkles active />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("cancels its frame on unmount", () => {
    const { unmount } = render(<Sparkles active />);
    act(() => runFrame(0));
    const [id] = [...frames.keys()];
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(id);
    expect(frames.size).toBe(0);
  });

  it("copes with a browser that has no 2D canvas", () => {
    HTMLCanvasElement.prototype.getContext.mockImplementation(() => null);
    render(<Sparkles active />);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
