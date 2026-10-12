import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplateStep from "./TemplateStep";
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
});
