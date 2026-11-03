import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import VenueStep from "./VenueStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("VenueStep", () => {
  it("stores the wedding date and venue", () => {
    const { latest } = renderStep(VenueStep, base());
    fireEvent.change(screen.getByLabelText("Main wedding date"), { target: { value: "2027-02-14" } });
    fireEvent.change(screen.getByLabelText("Venue name"), { target: { value: "Riviera Resort" } });
    expect(latest().mainDate).toBe("2027-02-14");
    expect(latest().venue.name).toEqual({ en: "Riviera Resort" });
  });

  it("sets and clears the end date for multi-day weddings", () => {
    const { latest } = renderStep(VenueStep, { ...base(), mainDate: "2027-02-14" });
    const input = screen.getByLabelText("Ends on (for multi-day weddings)");
    expect(input).toHaveAccessibleDescription("Leave empty for a single-day wedding.");
    fireEvent.change(input, { target: { value: "2027-02-15" } });
    expect(latest().mainDateEnd).toBe("2027-02-15");
    fireEvent.change(screen.getByLabelText("Ends on (for multi-day weddings)"), { target: { value: "" } });
    expect(latest().mainDateEnd).toBeUndefined();
  });

  it("shows the end date error", () => {
    renderStep(VenueStep, { ...base(), mainDate: "2027-02-14", mainDateEnd: "2027-02-14" });
    expect(screen.getByLabelText("Ends on (for multi-day weddings)")).toHaveAttribute("aria-invalid", "true");
  });

  it("explains a Maps link that isn't a full link, without losing the rest", () => {
    const { latest } = renderStep(VenueStep, { ...base(), venue: { name: { en: "Riviera" } } });
    fireEvent.change(screen.getByLabelText("Google Maps link"), { target: { value: "maps.google.com/x" } });
    const input = screen.getByLabelText("Google Maps link");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use the full link, starting with https://");
    expect(latest().venue.name).toEqual({ en: "Riviera" });
  });

  it("removes the Maps link when cleared", () => {
    const { latest } = renderStep(VenueStep, { ...base(), venue: { mapsUrl: "https://maps.app.goo.gl/x" } });
    fireEvent.change(screen.getByLabelText("Google Maps link"), { target: { value: "" } });
    expect(latest().venue).toEqual({});
  });

  it("switches the venue map button off and back on", () => {
    const { latest } = renderStep(VenueStep, { ...base(), venue: { mapsUrl: "https://maps.app.goo.gl/x" } });
    fireEvent.click(screen.getByLabelText('Show "Open in Google Maps"'));
    expect(latest().venue.hideMap).toBe(true);
    fireEvent.click(screen.getByLabelText('Show "Open in Google Maps"'));
    expect(latest().venue.hideMap).toBeUndefined();
  });

  it("offers the date styles rendered with the wedding dates", () => {
    renderStep(VenueStep, { ...base(), mainDate: "2027-02-14", mainDateEnd: "2027-02-15" });
    expect(screen.getByRole("button", { name: "14–15 · 02 · 2027" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "14th & 15th Feb 2027" })).toBeInTheDocument();
  });

  it("uses example dates when there is no date, and stores and clears the choice", () => {
    const { latest } = renderStep(VenueStep, base());
    fireEvent.click(screen.getByRole("button", { name: "11 & 12 December 2026" }));
    expect(latest().custom.dateStyle).toBe("dayMonth");
    fireEvent.click(screen.getByRole("button", { name: "11 · 12 · 2026".replace("11 ·", "11–12 ·") }));
    expect(latest().custom.dateStyle).toBeUndefined();
  });
});
