import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import PreviewPane, { READY_TIMEOUT_MS } from "./PreviewPane";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

const content = { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" };

function frameReady(iframe) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: READY_MESSAGE }, origin: window.location.origin, source: iframe.contentWindow }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PreviewPane", () => {
  it("sends the draft once the frame is ready, and again on every change", () => {
    const { rerender } = render(<PreviewPane content={content} />);
    const iframe = screen.getByTitle("Live preview");
    expect(iframe).toHaveAttribute("src", "/admin/preview-frame");
    const post = vi.spyOn(iframe.contentWindow, "postMessage");
    frameReady(iframe);
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content, lang: null }, window.location.origin);
    const next = { ...content, mainDate: "2027-02-14" };
    rerender(<PreviewPane content={next} />);
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content: next, lang: null }, window.location.origin);
  });

  it("offers a language switch only for bilingual invitations", () => {
    const { rerender } = render(<PreviewPane content={content} />);
    expect(screen.queryByRole("group", { name: "Preview language" })).not.toBeInTheDocument();
    const both = { ...content, language: "both" };
    rerender(<PreviewPane content={both} />);
    const iframe = screen.getByTitle("Live preview");
    const post = vi.spyOn(iframe.contentWindow, "postMessage");
    frameReady(iframe);
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content: both, lang: "hi" }, window.location.origin);
  });

  it("says when the preview can't load", () => {
    vi.useFakeTimers();
    render(<PreviewPane content={content} />);
    act(() => vi.advanceTimersByTime(READY_TIMEOUT_MS));
    expect(screen.getByRole("alert")).toHaveTextContent("Preview unavailable — reload the page.");
    expect(screen.getByTitle("Live preview")).toBeInTheDocument();
  });

  it("recovers when the frame reports ready after the timeout", () => {
    vi.useFakeTimers();
    render(<PreviewPane content={content} />);
    const iframe = screen.getByTitle("Live preview");
    const post = vi.spyOn(iframe.contentWindow, "postMessage");
    act(() => vi.advanceTimersByTime(READY_TIMEOUT_MS));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    frameReady(iframe);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith({ type: PREVIEW_MESSAGE, content, lang: null }, window.location.origin);
  });
});
