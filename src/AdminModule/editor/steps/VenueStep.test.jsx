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
});
