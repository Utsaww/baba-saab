import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import WordingStep from "./WordingStep";
import { renderStep } from "../test-utils";

describe("WordingStep", () => {
  it("renders the intro", () => {
    renderStep(WordingStep, { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });
    expect(screen.getByText(/wording and text style/)).toBeInTheDocument();
  });
});
