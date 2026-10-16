import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useRef } from "react";
import useFadeUp from "./useFadeUp";

const CLASSES = { pending: "pending", shown: "shown" };

function Page() {
  const ref = useRef(null);
  useFadeUp(ref, CLASSES);
  return (
    <div ref={ref}>
      <section data-section="a">A</section>
      <section data-section="b">B</section>
    </div>
  );
}

const sections = (container) => [...container.querySelectorAll("[data-section]")];

function mockObserver() {
  const instances = [];
  class FakeObserver {
    constructor(cb) {
      this.cb = cb;
      this.observed = [];
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      instances.push(this);
    }
    observe(el) {
      this.observed.push(el);
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return instances;
}

function mockReducedMotion(matches) {
  vi.stubGlobal("matchMedia", vi.fn((query) => ({ matches: matches && query.includes("reduce"), media: query })));
}

afterEach(() => vi.unstubAllGlobals());

describe("useFadeUp", () => {
  it("leaves sections visible when IntersectionObserver is missing", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Page />);
    for (const el of sections(container)) expect(el.className).toBe("");
  });

  it("hides sections until they scroll into view, then shows them once", () => {
    mockReducedMotion(false);
    const instances = mockObserver();
    render(<Page />);
    const [observer] = instances;
    const [a, b] = observer.observed;
    expect(a).toHaveClass("pending");
    expect(b).toHaveClass("pending");
    act(() => observer.cb([{ target: a, isIntersecting: true }, { target: b, isIntersecting: false }]));
    expect(a).toHaveClass("shown");
    expect(b).not.toHaveClass("shown");
    expect(observer.unobserve).toHaveBeenCalledWith(a);
  });

  it("does nothing under reduced motion", () => {
    mockReducedMotion(true);
    const instances = mockObserver();
    const { container } = render(<Page />);
    expect(instances).toHaveLength(0);
    for (const el of sections(container)) expect(el.className).toBe("");
  });

  it("disconnects on unmount", () => {
    mockReducedMotion(false);
    const instances = mockObserver();
    const { unmount } = render(<Page />);
    unmount();
    expect(instances[0].disconnect).toHaveBeenCalled();
  });
});
