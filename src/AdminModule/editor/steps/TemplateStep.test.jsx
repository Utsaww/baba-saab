import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplateStep from "./TemplateStep";
import { accentPasses, suggestAccent } from "@/InvitationModule/lib/colors";
import { renderStep, TEMPLATE_CHOICES } from "../test-utils";

const start = () => ({
  templateId: "royal",
  theme: { palette: "ivory" },
  language: "both",
  couple: { bride: { name: { en: "Priya", hi: "प्रिया" } } },
});

describe("TemplateStep", () => {
  it("switches design and moves to that design's first palette, keeping all content", async () => {
    const { latest } = renderStep(TemplateStep, start(), { templates: TEMPLATE_CHOICES });
    await userEvent.click(screen.getByRole("button", { name: "Floral Pastel" }));
    expect(latest().templateId).toBe("floral");
    expect(latest().theme.palette).toBe("blush");
    expect(latest().couple).toEqual(start().couple);
  });

  it("changes palette", async () => {
    const { latest } = renderStep(TemplateStep, start(), { templates: TEMPLATE_CHOICES });
    await userEvent.click(screen.getByRole("button", { name: "Maroon & Gold" }));
    expect(latest().theme.palette).toBe("maroon-gold");
  });

  it("switching to English only never deletes the Hindi text", async () => {
    const { latest } = renderStep(TemplateStep, start(), { templates: TEMPLATE_CHOICES });
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(latest().language).toBe("en");
    expect(latest().couple.bride.name).toEqual({ en: "Priya", hi: "प्रिया" });
  });

  describe("custom colours", () => {
    const custom = (colors) => ({ ...start(), theme: { palette: "custom", colors } });

    it("offers Custom only on designs with custom colours", () => {
      renderStep(TemplateStep, { ...start(), templateId: "temple", theme: { palette: "kumkum" } });
      expect(screen.queryByRole("button", { name: "Custom" })).toBeNull();
    });

    it("choosing Custom seeds the colours from the current palette", async () => {
      const { latest } = renderStep(TemplateStep, start());
      await userEvent.click(screen.getByRole("button", { name: "Custom" }));
      expect(latest().theme.palette).toBe("custom");
      expect(latest().theme.colors).toEqual({ bg: "#fffdf7", accent: "#a87a2a" });
      expect(screen.getByLabelText("Background")).toHaveValue("#fffdf7");
      expect(screen.getByLabelText("Accent")).toHaveValue("#a87a2a");
    });

    it("keeps saved colours when Custom is chosen again", async () => {
      const { latest } = renderStep(TemplateStep, { ...start(), theme: { palette: "ivory", colors: { bg: "#0b1d3a", accent: "#d4af37" } } });
      await userEvent.click(screen.getByRole("button", { name: "Custom" }));
      expect(latest().theme.colors).toEqual({ bg: "#0b1d3a", accent: "#d4af37" });
    });

    it("writes a typed colour code, and the picker, to the draft", async () => {
      const { latest } = renderStep(TemplateStep, custom({ bg: "#fff8e7", accent: "#7b1e3a" }));
      const bg = screen.getByLabelText("Background");
      await userEvent.clear(bg);
      await userEvent.type(bg, "#0B1D3A");
      expect(latest().theme.colors.bg).toBe("#0b1d3a");
      expect(screen.getByLabelText("Background colour picker")).toHaveValue("#0b1d3a");
      fireEvent.input(screen.getByLabelText("Accent colour picker"), { target: { value: "#d4af37" } });
      expect(latest().theme.colors.accent).toBe("#d4af37");
      expect(screen.getByLabelText("Accent")).toHaveValue("#d4af37");
    });

    it("never writes a half-typed code: shows a hint and keeps the last valid colour", async () => {
      const { latest } = renderStep(TemplateStep, custom({ bg: "#fff8e7", accent: "#7b1e3a" }));
      const bg = screen.getByLabelText("Background");
      await userEvent.clear(bg);
      await userEvent.type(bg, "#12");
      expect(screen.getByText("Use a colour code like #7B1E3A")).toBeInTheDocument();
      expect(latest().theme.colors.bg).toBe("#fff8e7");
    });

    it("warns about a weak accent and fixes it with the suggested colour", async () => {
      const { latest } = renderStep(TemplateStep, custom({ bg: "#fff8e7", accent: "#f3e5ab" }));
      expect(screen.getByText("This accent is hard to read on this background. Invitations can't go live until it's fixed.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Use suggested colour" }));
      const colors = latest().theme.colors;
      expect(colors.accent).toBe(suggestAccent({ bg: "#fff8e7", accent: "#f3e5ab" }));
      expect(accentPasses(colors)).toBe(true);
      expect(screen.queryByText(/hard to read/)).toBeNull();
      expect(screen.getByLabelText("Accent")).toHaveValue(colors.accent);
    });

    it("switching to Temple uses its palette and keeps the colours; switching back shows them again", async () => {
      const colors = { bg: "#7b1e3a", accent: "#d4af37" };
      const { latest } = renderStep(TemplateStep, custom(colors));
      await userEvent.click(screen.getByRole("button", { name: "Temple Classic" }));
      expect(latest().theme.palette).toBe("kumkum");
      expect(latest().theme.colors).toEqual(colors);
      expect(screen.queryByLabelText("Background")).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "Royal Rajasthani" }));
      await userEvent.click(screen.getByRole("button", { name: "Custom" }));
      expect(latest().theme.colors).toEqual(colors);
      expect(screen.getByLabelText("Background")).toHaveValue("#7b1e3a");
    });

    it("stays on Custom when switching between designs that offer it", async () => {
      const { latest } = renderStep(TemplateStep, custom({ bg: "#7b1e3a", accent: "#d4af37" }));
      await userEvent.click(screen.getByRole("button", { name: "Floral Pastel" }));
      expect(latest().theme.palette).toBe("custom");
    });
  });
});
