import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SectionsStep from "./SectionsStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("SectionsStep", () => {
  it("lists every section in order, all shown by default", () => {
    renderStep(SectionsStep, base());
    const items = within(screen.getByRole("list", { name: "Sections in order" })).getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items[0]).toHaveTextContent("Blessing");
    expect(screen.getByRole("checkbox", { name: "Show Travel notes" })).toBeChecked();
  });

  it("hides and shows a section", async () => {
    const { latest } = renderStep(SectionsStep, base());
    await userEvent.click(screen.getByRole("checkbox", { name: "Show Travel notes" }));
    expect(latest().theme.hidden).toEqual(["travel"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "Show Travel notes" }));
    expect(latest().theme.hidden).toEqual([]);
  });

  it("moves a section and stores the full order", async () => {
    const { latest } = renderStep(SectionsStep, base());
    await userEvent.click(screen.getByRole("button", { name: "Move Venue & map up" }));
    const order = latest().theme.sectionOrder;
    expect(order.indexOf("venue")).toBeLessThan(order.indexOf("countdown"));
    expect(order).toHaveLength(11);
    expect(latest().theme.palette).toBe("maroon-gold");
  });
});
