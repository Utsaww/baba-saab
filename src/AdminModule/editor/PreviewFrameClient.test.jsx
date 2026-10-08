import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import PreviewFrameClient from "./PreviewFrameClient";
import { PREVIEW_MESSAGE, READY_MESSAGE } from "./previewMessages";

const BANNER = "Sample details shown where you haven't filled in yet";

function send(data, origin = window.location.origin, source = window.parent) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin, source }));
  });
}

afterEach(() => vi.restoreAllMocks());

describe("PreviewFrameClient", () => {
  it("tells the editor it is ready", () => {
    const post = vi.spyOn(window, "postMessage");
    render(<PreviewFrameClient />);
    expect(post).toHaveBeenCalledWith({ type: READY_MESSAGE }, window.location.origin);
  });

  it("renders a brand-new draft with sample details, without the opening cover", () => {
    render(<PreviewFrameClient />);
    send({ type: PREVIEW_MESSAGE, content: { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" }, lang: null });
    expect(screen.getByText(BANNER)).toBeInTheDocument();
    expect(screen.getAllByText("Aarohi").length).toBeGreaterThan(0);
    expect(screen.queryByRole("dialog", { name: "Invitation cover" })).not.toBeInTheDocument();
  });

  it("shows the couple's own details once they are filled in", () => {
    render(<PreviewFrameClient />);
    send({
      type: PREVIEW_MESSAGE,
      content: {
        templateId: "royal",
        theme: { palette: "maroon-gold" },
        language: "both",
        couple: { bride: { name: { en: "Priya", hi: "प्रिया" } }, groom: { name: { en: "Rahul", hi: "राहुल" } } },
        mainDate: "2027-02-14",
        venue: { name: { en: "Riviera", hi: "रिवेरा" } },
      },
      lang: "hi",
    });
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    expect(screen.getAllByText("प्रिया").length).toBeGreaterThan(0);
    expect(screen.queryByText("Priya")).not.toBeInTheDocument();
  });

  it("ignores messages from other sites", () => {
    render(<PreviewFrameClient />);
    send({ type: PREVIEW_MESSAGE, content: { templateId: "royal", theme: { palette: "maroon-gold" } }, lang: null }, "https://evil.example");
    expect(screen.getByText("Loading preview…")).toBeInTheDocument();
  });

  it("ignores same-origin messages that don't come from the parent window", () => {
    render(<PreviewFrameClient />);
    send({ type: PREVIEW_MESSAGE, content: { templateId: "royal", theme: { palette: "maroon-gold" } }, lang: null }, window.location.origin, null);
    expect(screen.getByText("Loading preview…")).toBeInTheDocument();
  });

  it("falls back to the invitation's own language for an unknown lang", () => {
    render(<PreviewFrameClient />);
    send({
      type: PREVIEW_MESSAGE,
      content: {
        templateId: "royal",
        theme: { palette: "maroon-gold" },
        language: "en",
        couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
        mainDate: "2027-02-14",
        venue: { name: { en: "Riviera" } },
      },
      lang: "fr",
    });
    expect(screen.getAllByText("Priya").length).toBeGreaterThan(0);
  });
});
