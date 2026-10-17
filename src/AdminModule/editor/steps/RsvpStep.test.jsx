import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpStep from "./RsvpStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });

describe("RsvpStep", () => {
  it("turns on replies by WhatsApp and shows their settings", async () => {
    const { latest } = renderStep(RsvpStep, base());
    expect(screen.getByText(/Guests' replies open WhatsApp to the family contact number from step 2/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Last day to reply")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Guests reply on WhatsApp/ }));
    expect(latest().rsvp).toMatchObject({ enabled: true, channel: "whatsapp" });
    fireEvent.change(screen.getByLabelText("Last day to reply"), { target: { value: "2027-01-31" } });
    expect(latest().rsvp.deadline).toBe("2027-01-31");
    const count = screen.getByRole("checkbox", { name: /Ask how many people are coming/ });
    expect(count).toBeChecked();
    await userEvent.click(count);
    expect(latest().rsvp.askGuestCount).toBe(false);
    await userEvent.click(screen.getByRole("checkbox", { name: /Ask about meal preference/ }));
    expect(latest().rsvp.askMeal).toBe(true);
  });

  it("clears the last day to reply when it is emptied", () => {
    const { latest } = renderStep(RsvpStep, { ...base(), rsvp: { enabled: true, channel: "whatsapp", deadline: "2027-01-31" } });
    fireEvent.change(screen.getByLabelText("Last day to reply"), { target: { value: "" } });
    expect(latest().rsvp.deadline).toBeUndefined();
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

describe("RsvpStep with legacy RSVP content", () => {
  it("shows WhatsApp replies as off until staff turn them on", async () => {
    const { latest } = renderStep(RsvpStep, { ...base(), rsvp: { enabled: true, deadline: "2027-01-31" } });
    const toggle = screen.getByRole("checkbox", { name: /Guests reply on WhatsApp/ });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByLabelText("Last day to reply")).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(latest().rsvp).toMatchObject({ enabled: true, channel: "whatsapp", deadline: "2027-01-31" });
  });

  it("turns WhatsApp replies off", async () => {
    const { latest } = renderStep(RsvpStep, { ...base(), rsvp: { enabled: true, channel: "whatsapp" } });
    await userEvent.click(screen.getByRole("checkbox", { name: /Guests reply on WhatsApp/ }));
    expect(latest().rsvp.enabled).toBe(false);
  });
});
