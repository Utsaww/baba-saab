import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpForm from "./RsvpForm";

const events = [
  { id: "sangeet", name: { en: "Sangeet" } },
  { id: "vivah", name: { en: "Vivah" } },
];
const base = { lang: "en", events, askGuestCount: true, askMeal: false, closed: false, contactPhone: "+91 98765 43210" };

describe("<RsvpForm>", () => {
  it("shows a closed notice with the family's phone instead of the form", () => {
    render(<RsvpForm {...base} closed closedOnText="Saturday, 31 October 2026" onSubmit={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("RSVPs closed on Saturday, 31 October 2026");
    expect(screen.getByRole("link", { name: "+91 98765 43210" })).toHaveAttribute("href", "tel:+91 98765 43210");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows validation errors and does not submit", async () => {
    const onSubmit = vi.fn();
    render(<RsvpForm {...base} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(screen.getAllByText("This field is required")).toHaveLength(2);
    expect(screen.getByText("Enter a valid phone number")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a complete response and thanks the guest", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    render(<RsvpForm {...base} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "Sharma Parivar");
    await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
    await userEvent.click(screen.getByLabelText("Joyfully accept"));
    await userEvent.clear(screen.getByLabelText("Number of guests"));
    await userEvent.type(screen.getByLabelText("Number of guests"), "3");
    await userEvent.click(screen.getByLabelText("Sangeet"));
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sharma Parivar",
      phone: "9876543210",
      attending: "yes",
      guestCount: 3,
      eventIds: ["sangeet"],
      meal: undefined,
      message: undefined,
      website: "",
    });
    expect(await screen.findByText("Thank you! Your response has been received.")).toBeInTheDocument();
  });

  it("hides guest count and events when declining", async () => {
    render(<RsvpForm {...base} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Regretfully decline"));
    expect(screen.queryByLabelText("Number of guests")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sangeet")).not.toBeInTheDocument();
  });

  it("shows the server's message when submission fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: "RSVP opens once this invitation is published." });
    render(<RsvpForm {...base} askGuestCount={false} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "Gupta Ji");
    await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
    await userEvent.click(screen.getByLabelText("Not sure yet"));
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("RSVP opens once this invitation is published.");
  });
});
