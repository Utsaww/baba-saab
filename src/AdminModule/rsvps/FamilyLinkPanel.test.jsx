import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OFFLINE_MESSAGE } from "@/AdminModule/messages";
import { familyMessage, familyUrl } from "@/AdminModule/editor/publish/links";
import FamilyLinkPanel, { NEW_FAMILY_LINK_CONFIRM } from "./FamilyLinkPanel";

const URL_1 = "http://localhost:3000/rsvps/priya-rahul?k=tok1";

afterEach(() => vi.restoreAllMocks());

describe("family link helpers", () => {
  it("builds the family page link and message", () => {
    expect(familyUrl("https://x.in", "a-b", "t/k")).toBe("https://x.in/rsvps/a-b?k=t%2Fk");
    expect(familyMessage("U")).toMatch(/phone numbers/);
    expect(familyMessage("U").endsWith("\nU")).toBe(true);
  });
});

describe("FamilyLinkPanel", () => {
  it("shows the link with Copy and Send on WhatsApp", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<FamilyLinkPanel slug="priya-rahul" token="tok1" onNewLink={vi.fn()} />);
    expect(await screen.findByText(URL_1)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(URL_1);
    const wa = screen.getByRole("link", { name: "Send on WhatsApp" });
    expect(decodeURIComponent(wa.getAttribute("href"))).toContain(URL_1);
  });

  it("asks before making a new family link and shows the new one", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    const onNewLink = vi.fn(async () => ({ ok: true }));
    const { rerender } = render(<FamilyLinkPanel slug="priya-rahul" token="tok1" onNewLink={onNewLink} />);
    await userEvent.click(screen.getByRole("button", { name: "New family link" }));
    expect(confirm).toHaveBeenCalledWith(NEW_FAMILY_LINK_CONFIRM);
    expect(NEW_FAMILY_LINK_CONFIRM).toBe("The old family link will stop working.");
    expect(onNewLink).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "New family link" }));
    expect(onNewLink).toHaveBeenCalledTimes(1);
    rerender(<FamilyLinkPanel slug="priya-rahul" token="tok2" onNewLink={onNewLink} />);
    expect(screen.getByText("http://localhost:3000/rsvps/priya-rahul?k=tok2")).toBeInTheDocument();
  });

  it("shows why a new link failed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { rerender } = render(<FamilyLinkPanel slug="s" token="t" onNewLink={vi.fn(async () => ({ ok: false, message: "Nope" }))} />);
    await userEvent.click(screen.getByRole("button", { name: "New family link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
    rerender(<FamilyLinkPanel slug="s" token="t" onNewLink={vi.fn(async () => { throw new Error("x"); })} />);
    await userEvent.click(screen.getByRole("button", { name: "New family link" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(OFFLINE_MESSAGE));
  });

  it("explains when there is no link name or no token yet", () => {
    const { rerender } = render(<FamilyLinkPanel slug={null} token="t" onNewLink={vi.fn()} />);
    expect(screen.getByText(/Save a link name/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
    rerender(<FamilyLinkPanel slug="s" token={null} onNewLink={vi.fn()} />);
    expect(screen.getByText(/Make a family link/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New family link" })).toBeInTheDocument();
  });
});
