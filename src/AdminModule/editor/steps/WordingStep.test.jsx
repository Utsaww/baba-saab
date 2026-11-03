import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import WordingStep from "./WordingStep";
import { renderStep } from "../test-utils";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";

const start = (templateId = "royal", custom) => ({ templateId, theme: { palette: "maroon-gold" }, language: "en", custom });
const COUPLE_LINE = "Line above the couple's names";
// One element's controls inside the "Text size & style" group.
const styleControls = (name) => within(within(screen.getByRole("heading", { name: "Text size & style" }).closest("section")).getByRole("group", { name }));

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

  it("switches the countdown to a message and writes it", () => {
    const { latest } = renderStep(WordingStep, start());
    expect(screen.queryByLabelText("Message")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Message" }));
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "See you in Jaipur!" } });
    expect(latest().custom.countdown).toEqual({ mode: "message", message: { en: "See you in Jaipur!" } });
  });

  it("stops typing at the schema's caps, so no line is dropped on save", () => {
    renderStep(WordingStep, start("royal", { countdown: { mode: "message" } }));
    expect(screen.getByLabelText(COUPLE_LINE)).toHaveAttribute("maxLength", "160");
    expect(screen.getByLabelText("Message")).toHaveAttribute("maxLength", "200");
  });

  it("links to the Sections step to hide the countdown", () => {
    const onGoToStep = vi.fn();
    renderStep(WordingStep, start(), { onGoToStep });
    fireEvent.click(screen.getByRole("button", { name: /step 6/ }));
    expect(onGoToStep).toHaveBeenCalledWith(6);
  });

  it("sets a size and bold for the couple's names", () => {
    const { latest } = renderStep(WordingStep, start());
    const names = styleControls("Couple's names");
    fireEvent.click(names.getByRole("button", { name: "Largest" }));
    fireEvent.click(names.getByLabelText("Bold"));
    expect(latest().custom.styles).toEqual({ names: { size: "xl", bold: true } });
  });

  it("clears a style when set back to Normal or off", () => {
    const { latest } = renderStep(WordingStep, start("royal", { styles: { headings: { size: "lg", italic: true } } }));
    const headings = styleControls("Section headings");
    expect(headings.getByRole("button", { name: "Larger" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(headings.getByRole("button", { name: "Normal" }));
    fireEvent.click(headings.getByLabelText("Italic"));
    expect(latest().custom.styles.headings).toEqual({ size: undefined, italic: undefined });
  });

  it("resets all styles", () => {
    const { latest } = renderStep(WordingStep, start("royal", { dateStyle: "ordinal", styles: { names: { bold: true } } }));
    fireEvent.click(screen.getByRole("button", { name: "Reset styles" }));
    expect(latest().custom).toEqual({ dateStyle: "ordinal" });
  });
});
