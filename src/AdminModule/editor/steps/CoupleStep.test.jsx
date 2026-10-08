import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoupleStep from "./CoupleStep";
import { renderStep } from "../test-utils";

const base = (language = "both") => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language });

describe("CoupleStep", () => {
  it("asks for both languages on a bilingual invitation", () => {
    renderStep(CoupleStep, base("both"));
    expect(screen.getByLabelText("Bride's name (English)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bride's name (हिंदी)")).toBeInTheDocument();
  });

  it("stores the names as they are typed", () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    fireEvent.change(screen.getByLabelText("Groom's name"), { target: { value: "Rahul" } });
    expect(latest().couple).toEqual({ bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } });
  });

  it("adds and removes families", async () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    await userEvent.click(screen.getByRole("button", { name: "Add a family" }));
    fireEvent.change(screen.getByLabelText("Family 1"), { target: { value: "Sharma Parivar" } });
    expect(latest().hosts.families).toEqual([{ en: "Sharma Parivar" }]);
    await userEvent.click(screen.getByRole("button", { name: "Remove family 1" }));
    expect(latest().hosts.families).toEqual([]);
  });

  it("chooses a preset shloka or the family's own text", async () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Shloka" }), "mangalam");
    expect(latest().invocation.presetId).toBe("mangalam");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Shloka" }), "custom");
    expect(latest().invocation.presetId).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Shloka text"), { target: { value: "॥ श्री ॥" } });
    expect(latest().invocation.text).toEqual({ en: "॥ श्री ॥" });
  });

  it("stores the contact phone and clears it when emptied", () => {
    const { latest } = renderStep(CoupleStep, base("en"));
    fireEvent.change(screen.getByLabelText("Family contact phone"), { target: { value: "+91 98765 43210" } });
    expect(latest().hosts.contactPhone).toBe("+91 98765 43210");
    fireEvent.change(screen.getByLabelText("Family contact phone"), { target: { value: "" } });
    expect(latest().hosts.contactPhone).toBeUndefined();
  });
});
