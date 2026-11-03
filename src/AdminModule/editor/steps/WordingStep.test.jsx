import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import WordingStep from "./WordingStep";
import { renderStep } from "../test-utils";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";

const start = (templateId = "royal", custom) => ({ templateId, theme: { palette: "maroon-gold" }, language: "en", custom });
const COUPLE_LINE = "Line above the couple's names";

describe("WordingStep", () => {
  it("renders the intro", () => {
    renderStep(WordingStep, start());
    expect(screen.getByText(/wording and text style/)).toBeInTheDocument();
  });

  it("writes an override, with the template's line as the hint", () => {
    const { latest } = renderStep(WordingStep, start());
    const input = screen.getByLabelText(COUPLE_LINE);
    expect(screen.getByText(/Together with their families/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "You are cordially invited to the wedding of" } });
    expect(latest().custom.text.together.en).toBe("You are cordially invited to the wedding of");
  });

  it("clears the key when the line is emptied", () => {
    const { latest } = renderStep(WordingStep, start("royal", { text: { together: { en: "Hi" }, venue: { en: "Where" } } }));
    fireEvent.change(screen.getByLabelText(COUPLE_LINE), { target: { value: "" } });
    expect(latest().custom.text).toEqual({ venue: { en: "Where" } });
  });

  it("shows only the current template's lines", () => {
    renderStep(WordingStep, start("minimal"), { templates: templateChoices() });
    expect(screen.getByLabelText("Tap to open hint")).toBeInTheDocument();
    expect(screen.queryByLabelText("Blessing above the names")).toBeNull();
    expect(screen.queryByLabelText("Scratch hint")).toBeNull();
  });

  it("resets all wording", () => {
    const { latest } = renderStep(WordingStep, start("royal", { dateStyle: "ordinal", text: { together: { en: "Hi" } } }));
    fireEvent.click(screen.getByRole("button", { name: "Reset wording" }));
    expect(latest().custom).toEqual({ dateStyle: "ordinal" });
  });
});
