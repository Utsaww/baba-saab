import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RsvpForm from "./RsvpForm";

const events = [
  { id: "sangeet", name: { en: "Sangeet" } },
  { id: "vivah", name: { en: "Vivah" } },
];
const URL_FOR = "https://wa.me/919876543210?text=hello";
const compose = vi.fn((values) => ({ url: URL_FOR, message: `RSVP — ${values.name}` }));
const base = {
  lang: "en",
  events,
  askGuestCount: true,
  askMeal: false,
  closed: false,
  contactPhone: "+91 98765 43210",
  storageKey: "rsvp:meera-weds-arjun",
  compose,
};

async function fillAndSend({ name = "Sharma Parivar", guests = "3" } = {}) {
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
  await userEvent.click(screen.getByLabelText("Joyfully accept"));
  await userEvent.clear(screen.getByLabelText("Number of guests"));
  await userEvent.type(screen.getByLabelText("Number of guests"), guests);
  await userEvent.click(screen.getByLabelText("Sangeet"));
  await userEvent.click(screen.getByRole("button", { name: "Send RSVP on WhatsApp" }));
}

let open;
beforeEach(() => {
  compose.mockClear();
  open = vi.spyOn(window, "open").mockImplementation(() => null);
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("<RsvpForm>", () => {
  it("shows a closed notice with the family's phone instead of the form", () => {
    render(<RsvpForm {...base} closed closedOnText="Saturday, 31 October 2026" />);
    expect(screen.getByRole("status")).toHaveTextContent("RSVPs closed on Saturday, 31 October 2026");
    expect(screen.getByRole("link", { name: "+91 98765 43210" })).toHaveAttribute("href", "tel:+91 98765 43210");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows validation errors and does not open WhatsApp", async () => {
    render(<RsvpForm {...base} />);
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP on WhatsApp" }));
    expect(screen.getAllByText("This field is required")).toHaveLength(2);
    expect(screen.getByText("Enter a valid phone number")).toBeInTheDocument();
    expect(compose).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("opens WhatsApp with the composed reply", async () => {
    render(<RsvpForm {...base} />);
    await fillAndSend();
    expect(compose).toHaveBeenCalledWith({
      name: "Sharma Parivar",
      phone: "9876543210",
      attending: "yes",
      guestCount: 3,
      eventIds: ["sangeet"],
      meal: undefined,
      message: undefined,
    });
    expect(open).toHaveBeenCalledWith(URL_FOR, "_blank", "noopener,noreferrer");
  });

  it("always shows the message with Copy and Open WhatsApp afterwards, in case WhatsApp didn't open", async () => {
    render(<RsvpForm {...base} />);
    await fillAndSend();
    expect(screen.getByRole("textbox", { name: "Your RSVP message" })).toHaveValue("RSVP — Sharma Parivar");
    expect(screen.getByRole("textbox", { name: "Your RSVP message" })).toHaveAttribute("readonly");
    expect(screen.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute("href", URL_FOR);
    expect(screen.getByText(/If WhatsApp didn't open, copy the message and send it to/).closest("p")).toHaveTextContent("+91 98765 43210");
  });

  it("copies the message to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<RsvpForm {...base} />);
    await fillAndSend();
    await userEvent.click(screen.getByRole("button", { name: "Copy message" }));
    expect(writeText).toHaveBeenCalledWith("RSVP — Sharma Parivar");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("selects the message for copying by hand when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    render(<RsvpForm {...base} />);
    await fillAndSend();
    await userEvent.click(screen.getByRole("button", { name: "Copy message" }));
    const box = screen.getByRole("textbox", { name: "Your RSVP message" });
    expect(document.activeElement).toBe(box);
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe("RSVP — Sharma Parivar".length);
  });

  it("remembers the reply on this device and fills it in next time", async () => {
    const { unmount } = render(<RsvpForm {...base} />);
    await fillAndSend({ name: "Verma Ji", guests: "4" });
    unmount();
    render(<RsvpForm {...base} />);
    await act(async () => {});
    expect(screen.getByLabelText("Name")).toHaveValue("Verma Ji");
    expect(screen.getByLabelText("Number of guests")).toHaveValue(4);
    expect(screen.getByLabelText("Joyfully accept")).toBeChecked();
    expect(screen.getByLabelText("Sangeet")).toBeChecked();
    expect(screen.getByText("Your last reply is filled in — change anything and send again")).toBeInTheDocument();
  });

  it("keeps working when the device refuses storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(<RsvpForm {...base} />);
    await fillAndSend();
    expect(open).toHaveBeenCalled();
    expect(screen.queryByText(/Your last reply is filled in/)).not.toBeInTheDocument();
  });

  it("ignores a stored reply that isn't valid", async () => {
    localStorage.setItem("rsvp:meera-weds-arjun", "{not json");
    render(<RsvpForm {...base} />);
    await act(async () => {});
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("hides guest count and events when declining", async () => {
    render(<RsvpForm {...base} />);
    await userEvent.click(screen.getByLabelText("Regretfully decline"));
    expect(screen.queryByLabelText("Number of guests")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sangeet")).not.toBeInTheDocument();
  });

  it("does nothing for a bot that fills the hidden field", async () => {
    const { container } = render(<RsvpForm {...base} askGuestCount={false} />);
    await userEvent.type(container.querySelector('input[name="website"]'), "spam.example");
    await userEvent.type(screen.getByLabelText("Name"), "Bot");
    await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
    await userEvent.click(screen.getByLabelText("Not sure yet"));
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP on WhatsApp" }));
    expect(open).not.toHaveBeenCalled();
  });

  it("notes in previews that replies go to the family's WhatsApp", () => {
    render(<RsvpForm {...base} preview />);
    expect(screen.getByText("Preview — replies go to the family's WhatsApp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send RSVP on WhatsApp" })).toBeInTheDocument();
  });

  it("in a preview without a family number, asks for one and offers no send button", () => {
    render(<RsvpForm {...base} preview contactPhone={undefined} />);
    expect(screen.getByText("Add the family's WhatsApp number to enable replies")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send RSVP on WhatsApp" })).not.toBeInTheDocument();
  });

  it("renders nothing on a live page without a family number", () => {
    const { container } = render(<RsvpForm {...base} contactPhone={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("writes everything in Hindi for a Hindi invitation", async () => {
    render(<RsvpForm {...base} lang="hi" preview />);
    expect(screen.getByText("पूर्वावलोकन — उत्तर परिवार के व्हाट्सऐप पर जाएँगे")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "व्हाट्सऐप पर उत्तर भेजें" })).toBeInTheDocument();
  });
});
