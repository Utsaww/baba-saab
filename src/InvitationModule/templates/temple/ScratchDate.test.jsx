import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchCard } from "./ScratchDate";

const MONTH = { en: "Month", hi: "माह" };

function fakeContext({ cleared }) {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    // Every sampled pixel transparent (fully scratched) or opaque (untouched).
    getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(cleared ? 0 : 255) }),
  };
}

function withCanvas(ctx) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ left: 0, top: 0, width: 90, height: 70, right: 90, bottom: 70 }));
}

afterEach(() => vi.restoreAllMocks());

const card = (props = {}) => render(<ScratchCard label={MONTH} value="Nov" lang="en" revealed={false} onReveal={() => {}} {...props} />);

describe("ScratchCard", () => {
  it("shows its label and a scratch hint, and keeps the value from screen readers until revealed", () => {
    card();
    expect(screen.getByText("Month")).toBeInTheDocument();
    expect(screen.getByText("Scratch")).toBeInTheDocument();
    expect(screen.getByText("Nov").closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Month: scratch, or press Enter to reveal" })).toBeInTheDocument();
  });

  it("reveals from the keyboard (or a screen reader's click)", () => {
    const onReveal = vi.fn();
    card({ onReveal });
    // Keyboard and assistive-technology clicks carry no click count.
    fireEvent.click(screen.getByRole("button"), { detail: 0 });
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("does not reveal on a plain mouse click or tap — those scratch instead", () => {
    const onReveal = vi.fn();
    card({ onReveal });
    fireEvent.click(screen.getByRole("button"), { detail: 1 });
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("paints a gold foil over the value when it mounts", () => {
    const ctx = fakeContext({ cleared: false });
    withCanvas(ctx);
    card();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("reveals once about half the foil has been scratched away", () => {
    const ctx = fakeContext({ cleared: true });
    withCanvas(ctx);
    const onReveal = vi.fn();
    const { container } = card({ onReveal });
    const canvas = container.querySelector("canvas");
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1, buttons: 1 });
    for (let i = 0; i < 12; i++) fireEvent.pointerMove(canvas, { clientX: 10 + i * 6, clientY: 30, pointerId: 1, buttons: 1 });
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("keeps the foil while too little has been scratched", () => {
    const ctx = fakeContext({ cleared: false });
    withCanvas(ctx);
    const onReveal = vi.fn();
    const { container } = card({ onReveal });
    const canvas = container.querySelector("canvas");
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1, buttons: 1 });
    for (let i = 0; i < 12; i++) fireEvent.pointerMove(canvas, { clientX: 10 + i, clientY: 10, pointerId: 1, buttons: 1 });
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("shows the value plainly once revealed: no foil, no button", () => {
    const { container } = card({ revealed: true });
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.getByText("Nov").closest("[aria-hidden]")).toBeNull();
  });

  it("labels the card in Hindi for a Hindi invitation", () => {
    card({ lang: "hi", value: "नवंबर" });
    expect(screen.getByText("माह")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "माह: खुरचें, या देखने के लिए एंटर दबाएँ" })).toBeInTheDocument();
  });
});
