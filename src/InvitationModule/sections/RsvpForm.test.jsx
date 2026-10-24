import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("ignores a stored attending answer that isn't yes, no or maybe", async () => {
    localStorage.setItem("rsvp:meera-weds-arjun", JSON.stringify({ name: "Verma Ji", attending: "bogus" }));
    render(<RsvpForm {...base} />);
    await act(async () => {});
    expect(screen.getByLabelText("Name")).toHaveValue("Verma Ji");
    for (const label of ["Joyfully accept", "Regretfully decline", "Not sure yet"]) expect(screen.getByLabelText(label)).not.toBeChecked();
  });

  it("says so instead of doing nothing when the reply can't be addressed", async () => {
    render(<RsvpForm {...base} preview compose={() => null} />);
    await fillAndSend();
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Replies can't be sent: the family's WhatsApp number isn't valid.");
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

  describe("live pages that save the reply", () => {
    let win;
    beforeEach(() => {
      win = { location: "", close: vi.fn(), opener: {} };
      open.mockImplementation(() => win);
    });
    const SAVED = "Your reply is saved. Send it on WhatsApp to let the family know personally.";
    const FAILED = "We couldn't save your reply — your WhatsApp message still reaches the family.";

    it("opens a blank window synchronously, saves once, then points the window at WhatsApp", async () => {
      let release;
      const save = vi.fn(() => new Promise((resolve) => (release = resolve)));
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(open).toHaveBeenCalledTimes(1);
      expect(open.mock.calls[0][0]).toBe("");
      expect(win.location).toBe("");
      await act(async () => release({ ok: true, updated: false }));
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: "Sharma Parivar", phone: "9876543210", attending: "yes", guestCount: 3, eventIds: ["sangeet"] }), { timeoutMs: 8000 });
      expect(win.location).toBe(URL_FOR);
      expect(win.opener).toBeNull();
      expect(screen.getByText(SAVED)).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Your RSVP message" })).toBeInTheDocument();
    });

    it("retries once on a server error, then says it couldn't save and still opens WhatsApp", async () => {
      const save = vi.fn().mockResolvedValue({ ok: false, reason: "error" });
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(save).toHaveBeenCalledTimes(2);
      expect(screen.getByText(FAILED)).toBeInTheDocument();
      expect(win.location).toBe(URL_FOR);
    });

    it("saves on the retry when the first attempt fails", async () => {
      const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ ok: true });
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(save).toHaveBeenCalledTimes(2);
      expect(screen.getByText(SAVED)).toBeInTheDocument();
    });

    it("does not retry when rate limited, and still opens WhatsApp", async () => {
      const save = vi.fn().mockResolvedValue({ ok: false, reason: "rate" });
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(save).toHaveBeenCalledTimes(1);
      expect(screen.getByText(FAILED)).toBeInTheDocument();
      expect(win.location).toBe(URL_FOR);
    });

    it("shows the closed notice and never opens WhatsApp when replies have closed", async () => {
      const save = vi.fn().mockResolvedValue({ ok: false, reason: "closed" });
      render(<RsvpForm {...base} save={save} closedOnText="Saturday, 31 October 2026" />);
      await fillAndSend();
      expect(screen.getByRole("status")).toHaveTextContent("RSVPs closed on Saturday, 31 October 2026");
      expect(win.location).toBe("");
      expect(win.close).toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Send RSVP on WhatsApp" })).not.toBeInTheDocument();
    });

    it("falls back to the copy panel when the pop-up is blocked", async () => {
      open.mockImplementation(() => null);
      const save = vi.fn().mockResolvedValue({ ok: true });
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(screen.getByText(SAVED)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute("href", URL_FOR);
    });

    it("ignores a second tap while the save is in flight", async () => {
      let release;
      const save = vi.fn(() => new Promise((resolve) => (release = resolve)));
      render(<RsvpForm {...base} save={save} />);
      await userEvent.type(screen.getByLabelText("Name"), "Sharma Parivar");
      await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
      await userEvent.click(screen.getByLabelText("Joyfully accept"));
      const form = screen.getByRole("button", { name: "Send RSVP on WhatsApp" }).closest("form");
      await act(async () => {
        fireEvent.submit(form);
        fireEvent.submit(form);
      });
      expect(save).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledTimes(1);
      await act(async () => release({ ok: true }));
      expect(win.location).toBe(URL_FOR);
    });

    it("tells the guest it is saving, in a live region that stays mounted", async () => {
      let release;
      const save = vi.fn(() => new Promise((resolve) => (release = resolve)));
      render(<RsvpForm {...base} save={save} />);
      const region = screen.getByRole("status");
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toBeEmptyDOMElement();
      await fillAndSend();
      expect(screen.getByRole("status")).toBe(region);
      expect(region).toHaveTextContent("Saving…");
      await act(async () => release({ ok: true }));
      expect(screen.getByRole("status")).toBe(region);
      expect(region).toHaveTextContent(SAVED);
      expect(region).not.toHaveTextContent("Saving…");
    });

    it("says it is saving in Hindi", async () => {
      const save = vi.fn(() => new Promise(() => {}));
      render(<RsvpForm {...base} lang="hi" save={save} />);
      await userEvent.type(screen.getByLabelText("नाम"), "Sharma");
      await userEvent.type(screen.getByLabelText("फ़ोन"), "9876543210");
      await userEvent.click(screen.getByLabelText("अभी तय नहीं"));
      await userEvent.click(screen.getByRole("button", { name: "व्हाट्सऐप पर उत्तर भेजें" }));
      expect(screen.getByRole("status")).toHaveTextContent("सहेज रहे हैं…");
    });

    it("moves focus to the closed notice when replies have closed", async () => {
      const save = vi.fn().mockResolvedValue({ ok: false, reason: "closed" });
      render(<RsvpForm {...base} save={save} closedOnText="Saturday, 31 October 2026" />);
      await fillAndSend();
      expect(document.activeElement).toBe(screen.getByRole("status"));
    });

    it("gives the retry only the time left in the overall budget", async () => {
      let now = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      const save = vi.fn(async () => {
        now += 7000;
        return { ok: false, reason: "error" };
      });
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save.mock.calls[0][1]).toEqual({ timeoutMs: 8000 });
      expect(save.mock.calls[1][1].timeoutMs).toBeLessThanOrEqual(5000);
      expect(save.mock.calls[1][1].timeoutMs).toBeGreaterThan(0);
    });

    it("does not retry when the first attempt used up the budget", async () => {
      let now = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      const save = vi.fn(async () => {
        now += 11800;
        return { ok: false, reason: "error" };
      });
      render(<RsvpForm {...base} save={save} />);
      await fillAndSend();
      expect(save).toHaveBeenCalledTimes(1);
      expect(screen.getByText(FAILED)).toBeInTheDocument();
    });

    it("a preview page has no save to call, so it opens WhatsApp directly and never shows saved copy", async () => {
      open.mockImplementation(() => null);
      render(<RsvpForm {...base} preview />);
      await fillAndSend();
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith(URL_FOR, "_blank", "noopener,noreferrer");
      expect(screen.queryByText(SAVED)).not.toBeInTheDocument();
    });

    it("says nothing about saving when no save is wired", async () => {
      render(<RsvpForm {...base} />);
      await fillAndSend();
      expect(screen.queryByText(SAVED)).not.toBeInTheDocument();
      expect(screen.queryByText(FAILED)).not.toBeInTheDocument();
    });
  });

  it("limits the name to 100 characters and the message to 1000", () => {
    render(<RsvpForm {...base} />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("Message for the couple")).toHaveAttribute("maxlength", "1000");
  });

  it("writes everything in Hindi for a Hindi invitation", async () => {
    render(<RsvpForm {...base} lang="hi" preview />);
    expect(screen.getByText("पूर्वावलोकन — उत्तर परिवार के व्हाट्सऐप पर जाएँगे")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "व्हाट्सऐप पर उत्तर भेजें" })).toBeInTheDocument();
  });
});
