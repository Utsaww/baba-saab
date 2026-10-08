import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewStep from "./ReviewStep";
import { renderStep } from "../test-utils";

const complete = () => ({
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Riviera" }, address: { en: "MG Road" } },
});

describe("ReviewStep", () => {
  it("lists what is missing and jumps to the step that fixes it", async () => {
    const onGoToStep = vi.fn();
    renderStep(ReviewStep, { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" }, { onGoToStep });
    expect(screen.getByText("Add the bride's name")).toBeInTheDocument();
    expect(screen.getByText("Add the wedding date")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Go to step 3" })[0]);
    expect(onGoToStep).toHaveBeenCalledWith(3);
  });

  it("says when everything needed is filled in", () => {
    renderStep(ReviewStep, complete());
    expect(screen.getByText("Everything needed is filled in.")).toBeInTheDocument();
  });

  it("shows Publish as not yet available", () => {
    renderStep(ReviewStep, complete());
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText(/Publishing arrives in the next release/)).toBeInTheDocument();
  });
});
