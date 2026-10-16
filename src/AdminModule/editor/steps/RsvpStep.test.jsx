import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpStep from "./RsvpStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("RsvpStep", () => {
  it("hides the RSVP settings while RSVPs are parked, keeping what was stored", () => {
    const stored = { ...base(), rsvp: { enabled: true, deadline: "2027-01-31", askMeal: true } };
    const { latest } = renderStep(RsvpStep, stored);
    expect(screen.queryByRole("checkbox", { name: /Ask guests to RSVP/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Last day to RSVP")).not.toBeInTheDocument();
    expect(screen.queryByText("RSVP")).not.toBeInTheDocument();
    expect(latest().rsvp).toEqual(stored.rsvp);
  });

  it("turns the Baba Saab credit off", async () => {
    const { latest } = renderStep(RsvpStep, base());
    const credit = screen.getByRole("checkbox", { name: /Created by Baba Saab Events/ });
    expect(credit).toBeChecked();
    await userEvent.click(credit);
    expect(latest().showCredit).toBe(false);
  });

  it("shows the take-offline date when one is given", async () => {
    const onSave = vi.fn(async () => ({ ok: true }));
    renderStep(RsvpStep, base(), { offlineField: { value: "2099-02-21", onSave, pending: false, lastEventDate: "2099-02-14" } });
    fireEvent.change(screen.getByLabelText("Take offline on"), { target: { value: "2099-03-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Save date" }));
    expect(onSave).toHaveBeenCalledWith("2099-03-01");
  });

  it("shows no take-offline date without one", () => {
    renderStep(RsvpStep, base());
    expect(screen.queryByLabelText("Take offline on")).not.toBeInTheDocument();
  });
});
