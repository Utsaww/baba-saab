import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import MediaStep from "./MediaStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("MediaStep", () => {
  it("stores a YouTube film link", () => {
    const { latest } = renderStep(MediaStep, base());
    fireEvent.change(screen.getByLabelText("YouTube link"), { target: { value: " https://youtu.be/dQw4w9WgXcQ " } });
    expect(latest().media.film).toEqual({ type: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" });
  });

  it("explains a link that isn't YouTube", () => {
    renderStep(MediaStep, { ...base(), media: { film: { type: "youtube", url: "https://example.com/film" } } });
    expect(screen.getByLabelText("YouTube link")).toHaveAttribute("aria-invalid", "true");
  });

  it("removes the film when the link is cleared", () => {
    const { latest } = renderStep(MediaStep, { ...base(), media: { film: { type: "youtube", url: "https://youtu.be/x" } } });
    fireEvent.change(screen.getByLabelText("YouTube link"), { target: { value: "" } });
    expect(latest().media).toEqual({});
  });

  it("says photos and music are coming", () => {
    renderStep(MediaStep, base());
    expect(screen.getByText(/coming in the next release/)).toBeInTheDocument();
  });
});
