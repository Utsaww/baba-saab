import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpStep from "./RsvpStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("RsvpStep", () => {
  it("shows the RSVP options only once RSVPs are switched on", async () => {
    const { latest } = renderStep(RsvpStep, base());
    expect(screen.queryByLabelText("Last day to RSVP")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Ask guests to RSVP/ }));
    expect(latest().rsvp.enabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Last day to RSVP"), { target: { value: "2027-01-31" } });
    expect(latest().rsvp.deadline).toBe("2027-01-31");
    expect(screen.getByRole("checkbox", { name: /how many people/ })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /meal preference/ }));
    expect(latest().rsvp.askMeal).toBe(true);
  });

  it("turns the Baba Saab credit off", async () => {
    const { latest } = renderStep(RsvpStep, base());
    const credit = screen.getByRole("checkbox", { name: /Created by Baba Saab Events/ });
    expect(credit).toBeChecked();
    await userEvent.click(credit);
    expect(latest().showCredit).toBe(false);
  });
});
