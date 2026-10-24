import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OFFLINE_MESSAGE } from "@/AdminModule/messages";
import { familyNote, toCsv } from "@/InvitationModule/lib/rsvpList";
import RsvpPage from "./RsvpPage";

const events = [
  { id: "haldi", name: { en: "Haldi" } },
  { id: "sangeet", name: { en: "Sangeet" } },
];
const invitation = { id: "inv-1", slug: "priya-rahul", title: "Priya & Rahul", language: "en", events, familyToken: "fam" };

const rows = [
  { rsvpKey: "919876543210#asha", phoneKey: "919876543210", name: "Asha", phone: "+91 98765 43210", attending: "yes", guestCount: 3, eventIds: ["haldi"], source: "guest", updatedAt: "2026-10-20T10:00:00.000Z" },
  { rsvpKey: "919876543210#ravi", phoneKey: "919876543210", name: "Ravi", phone: "9876543210", attending: "yes", eventIds: [], source: "guest", updatedAt: "2026-10-22T10:00:00.000Z" },
  { rsvpKey: "919811111111#meena", phoneKey: "919811111111", name: "Meena", phone: "9811111111", attending: "maybe", guestCount: 2, eventIds: [], source: "guest", updatedAt: "2026-10-21T10:00:00.000Z" },
  { rsvpKey: "staff#1", name: "Kamal", attending: "no", eventIds: [], source: "staff", updatedAt: "2026-10-19T10:00:00.000Z" },
];

const makeActions = (over = {}) => ({
  saveRsvpAction: vi.fn(async () => ({ ok: true, rsvpKey: "staff#new" })),
  removeRsvpAction: vi.fn(async () => ({ ok: true })),
  newFamilyLinkAction: vi.fn(async () => ({ ok: true, familyToken: "fam2" })),
  markRsvpsSeenAction: vi.fn(async () => ({ ok: true })),
  ...over,
});

const renderPage = (actions = makeActions(), props = {}) => {
  render(<RsvpPage invitation={invitation} initialRows={rows} actions={actions} {...props} />);
  return actions;
};

const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
const names = () => bodyRows().map((r) => within(r).getAllByRole("cell")[0].textContent.replace("!", "").trim());

afterEach(() => vi.restoreAllMocks());

describe("RsvpPage", () => {
  it("marks replies as seen when the page opens", async () => {
    const actions = renderPage();
    await waitFor(() => expect(actions.markRsvpsSeenAction).toHaveBeenCalledWith("inv-1"));
    expect(actions.markRsvpsSeenAction).toHaveBeenCalledTimes(1);
  });

  it("shows totals and per-event headcounts", () => {
    renderPage();
    const totals = screen.getByRole("region", { name: "Totals" });
    expect(within(totals).getByText("Coming").nextSibling).toHaveTextContent("2");
    expect(within(totals).getByText("Not coming").nextSibling).toHaveTextContent("1");
    expect(within(totals).getByText("Maybe").nextSibling).toHaveTextContent("1");
    expect(within(totals).getByText("People coming").nextSibling).toHaveTextContent("4");
    expect(within(totals).getByText("Haldi").nextSibling).toHaveTextContent("4");
    expect(within(totals).getByText("Sangeet").nextSibling).toHaveTextContent("1");
  });

  it("lists replies newest first with the same-family marker on shared phones", () => {
    renderPage();
    expect(names()).toEqual(["Ravi", "Meena", "Asha", "Kamal"]);
    expect(screen.getByRole("img", { name: familyNote(["Ravi"]) })).toHaveAttribute("title", familyNote(["Ravi"]));
    expect(screen.getByRole("img", { name: familyNote(["Asha"]) })).toBeInTheDocument();
    expect(within(bodyRows()[1]).queryByRole("img")).toBeNull();
    expect(within(bodyRows()[3]).queryByRole("img")).toBeNull();
    expect(within(bodyRows()[2]).getByText("Haldi")).toBeInTheDocument();
    expect(within(bodyRows()[0]).getByText("All events")).toBeInTheDocument();
  });

  it("filters by search, event and attending", async () => {
    renderPage();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search replies" }), "98111");
    expect(names()).toEqual(["Meena"]);
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search replies" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Attending" }), "yes");
    expect(names()).toEqual(["Ravi", "Asha"]);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Attending" }), "all");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Event" }), "sangeet");
    expect(names()).toEqual(["Ravi", "Meena", "Kamal"]);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search replies" }), "zzz");
    expect(screen.getByText("No replies match your search.")).toBeInTheDocument();
  });

  it("adds a reply taken by phone (phone optional)", async () => {
    const actions = renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Add reply" }));
    const form = screen.getByRole("form", { name: "Add reply" });
    await userEvent.type(within(form).getByLabelText("Name"), "Gopal");
    await userEvent.type(within(form).getByLabelText(/People/), "2");
    await userEvent.click(within(form).getByRole("checkbox", { name: "Sangeet" }));
    await userEvent.click(within(form).getByRole("button", { name: "Save reply" }));
    await waitFor(() => expect(actions.saveRsvpAction).toHaveBeenCalled());
    const [id, row, opts] = actions.saveRsvpAction.mock.calls[0];
    expect(id).toBe("inv-1");
    expect(row).toMatchObject({ name: "Gopal", phone: "", attending: "yes", guestCount: 2, eventIds: ["sangeet"] });
    expect(opts).toEqual({ previousKey: undefined });
    await waitFor(() => expect(names()[0]).toBe("Gopal"));
    expect(screen.queryByRole("form", { name: "Add reply" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Saved: Gopal");
  });

  it("edits a reply with its previous key and shows a save error", async () => {
    const actions = renderPage(makeActions({ saveRsvpAction: vi.fn(async () => ({ ok: false, message: "Another reply already uses this name and phone — edit that one instead." })) }));
    await userEvent.click(screen.getByRole("button", { name: "Edit: Meena" }));
    const form = screen.getByRole("form", { name: "Edit reply" });
    expect(within(form).getByLabelText("Name")).toHaveValue("Meena");
    await userEvent.click(within(form).getByRole("radio", { name: "Coming" }));
    await userEvent.click(within(form).getByRole("button", { name: "Save reply" }));
    await waitFor(() => expect(actions.saveRsvpAction).toHaveBeenCalled());
    const [, row, opts] = actions.saveRsvpAction.mock.calls[0];
    expect(row).toMatchObject({ name: "Meena", phone: "9811111111", attending: "yes", guestCount: 2 });
    expect(opts).toEqual({ previousKey: "919811111111#meena" });
    expect(await within(form).findByRole("alert")).toHaveTextContent("Another reply already uses this name and phone");
  });

  it("replaces the edited row under its new key", async () => {
    const actions = renderPage(makeActions({ saveRsvpAction: vi.fn(async () => ({ ok: true, rsvpKey: "919811111111#meena devi" })) }));
    await userEvent.click(screen.getByRole("button", { name: "Edit: Meena" }));
    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Meena Devi");
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    await waitFor(() => expect(names()[0]).toBe("Meena Devi"));
    expect(names()).not.toContain("Meena");
    expect(names()).toHaveLength(4);
    expect(actions.saveRsvpAction).toHaveBeenCalledTimes(1);
  });

  it("shows the offline message when a save never answers", async () => {
    renderPage(makeActions({ saveRsvpAction: vi.fn(async () => { throw new Error("net"); }) }));
    await userEvent.click(screen.getByRole("button", { name: "Edit: Meena" }));
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(OFFLINE_MESSAGE);
  });

  it("removes a reply only after confirming", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const actions = renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Remove: Kamal" }));
    expect(confirm).toHaveBeenCalledWith("Remove the reply from Kamal?");
    expect(actions.removeRsvpAction).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Remove: Kamal" }));
    await waitFor(() => expect(actions.removeRsvpAction).toHaveBeenCalledWith("inv-1", "staff#1"));
    await waitFor(() => expect(names()).not.toContain("Kamal"));
  });

  it("shows a per-row error when removing fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage(makeActions({ removeRsvpAction: vi.fn(async () => ({ ok: false, message: "Nope" })) }));
    await userEvent.click(screen.getByRole("button", { name: "Remove: Kamal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
    expect(names()).toContain("Kamal");
  });

  describe("Download CSV", () => {
    let blobs;
    beforeEach(() => {
      blobs = [];
      URL.createObjectURL = vi.fn((b) => {
        blobs.push(b);
        return "blob:x";
      });
      URL.revokeObjectURL = vi.fn();
    });

    it("downloads <slug>-rsvps.csv with the toCsv text (BOM once)", async () => {
      let downloaded;
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
        downloaded = { name: this.download, href: this.href };
      });
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));
      expect(downloaded).toEqual({ name: "priya-rahul-rsvps.csv", href: "blob:x" });
      const read = (how) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader[how](blobs[0]);
        });
      const text = await read("readAsText");
      const expected = toCsv([...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), events, "en");
      expect(text.replace(/^﻿/, "")).toBe(expected.replace(/^﻿/, ""));
      const bytes = new Uint8Array(await read("readAsArrayBuffer"));
      expect([...bytes.slice(0, 4)]).toEqual([0xef, 0xbb, 0xbf, 0x4e]);
    });

    it("falls back to the invitation id without a link name", async () => {
      let name;
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
        name = this.download;
      });
      render(<RsvpPage invitation={{ ...invitation, slug: null }} initialRows={rows} actions={makeActions()} />);
      await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));
      expect(name).toBe("inv-1-rsvps.csv");
    });
  });

  it("shows an empty state and a load error", () => {
    const { unmount } = render(<RsvpPage invitation={invitation} initialRows={[]} actions={makeActions()} />);
    expect(screen.getByText("No replies yet.")).toBeInTheDocument();
    unmount();
    render(<RsvpPage invitation={invitation} initialRows={null} actions={makeActions()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load replies. Refresh the page to try again.");
  });

  it("updates the family link after a new one is made", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const actions = renderPage();
    expect(await screen.findByText("http://localhost:3000/rsvps/priya-rahul?k=fam")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New family link" }));
    expect(actions.newFamilyLinkAction).toHaveBeenCalledWith("inv-1");
    expect(await screen.findByText("http://localhost:3000/rsvps/priya-rahul?k=fam2")).toBeInTheDocument();
  });
});
