import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (typeof document !== "undefined") document.body.style.overflow = "";
});

// jsdom has no canvas or media playback; components must cope with that anyway.
// Backend tests run in plain Node, where these browser globals don't exist.
if (typeof window !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
}
