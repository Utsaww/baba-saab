import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpForm from "./RsvpForm";

const events = [{ id: "haldi", name: { en: "Haldi" } }];
const renderForm = (props = {}) => {
  const onSave = vi.fn();
  render(<RsvpForm events={events} language="en" onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};

describe("RsvpForm", () => {
  it("requires a name", async () => {
    const onSave = renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter the guest's name")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Fix the highlighted fields");
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("saves without a phone, trimming fields and leaving guest count empty", async () => {
    const onSave = renderForm();
    await userEvent.type(screen.getByLabelText("Name"), "  Gopal ");
    await userEvent.selectOptions(screen.getByLabelText("Meal"), "jain");
    await userEvent.type(screen.getByLabelText("Message"), "Will call");
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    expect(onSave).toHaveBeenCalledWith({ name: "Gopal", phone: "", attending: "yes", guestCount: null, eventIds: [], meal: "jain", message: "Will call" });
  });

  it("rejects a phone that isn't a number and a bad guest count", async () => {
    const onSave = renderForm();
    await userEvent.type(screen.getByLabelText("Name"), "A");
    await userEvent.type(screen.getByLabelText(/Phone/), "abc");
    await userEvent.type(screen.getByLabelText(/People/), "99");
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a phone number, or leave it empty")).toBeInTheDocument();
    expect(screen.getByText("Enter a number from 1 to 20, or leave it empty")).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/)).toHaveFocus();
  });

  it("drops the guest count for Not coming", async () => {
    const onSave = renderForm({ initial: { name: "A", attending: "yes", guestCount: 3, eventIds: [] } });
    await userEvent.click(screen.getByRole("radio", { name: "Not coming" }));
    expect(screen.queryByLabelText(/People/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ attending: "no", guestCount: null });
  });

  it("disables saving while a save is running", () => {
    renderForm({ pending: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
