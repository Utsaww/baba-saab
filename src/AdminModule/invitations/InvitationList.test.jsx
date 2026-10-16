import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OFFLINE_MESSAGE } from "@/AdminModule/messages";
import { deleteConfirm, TAKE_OFFLINE_CONFIRM } from "@/AdminModule/editor/lifecycle/InvitationMenu";
import InvitationList from "./InvitationList";

const now = Date.parse("2026-10-08T12:00:00.000Z");
const rows = [
  { id: "a", status: "draft", templateId: "royal", mainDate: "2027-02-14", coupleNames: "Priya & Rahul", searchText: "priya rahul", updatedAt: "2026-10-08T09:00:00.000Z", updatedBy: "neha@example.com" },
  { id: "b", status: "draft", templateId: "floral", mainDate: null, coupleNames: "Untitled invitation", searchText: "", updatedAt: "2026-10-08T11:58:00.000Z", updatedBy: "amit@example.com" },
];
const templateNames = { royal: "Royal Rajasthani", floral: "Floral Pastel" };

describe("InvitationList", () => {
  it("lists invitations newest edit first, linking to the editor", () => {
    render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/invitations/b/edit", "/admin/invitations/a/edit"]);
    expect(within(links[1]).getByText("Royal Rajasthani")).toBeInTheDocument();
    expect(within(links[1]).getByText("Edited 3 h ago by neha@example.com")).toBeInTheDocument();
    expect(within(links[0]).getByText("No date yet")).toBeInTheDocument();
  });

  it("searches by name", async () => {
    render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search invitations" }), "priya");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search invitations" }), "zzz");
    expect(screen.getByText("No invitations match your search.")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "published");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows whether guests see the latest version, with an Open link for published invitations", () => {
    const row = (id, extra) => ({ ...rows[0], id, coupleNames: `Couple ${id}`, ...extra });
    const live = [
      row("d", { status: "draft" }),
      row("l", { status: "published", version: 7, liveVersion: 7, slug: "a-b" }),
      row("c", { status: "published", version: 8, liveVersion: 7, slug: "c-d" }),
    ];
    render(<InvitationList rows={live} templateNames={templateNames} now={now} />);
    const item = (name) => screen.getByText(name).closest("li");
    expect(within(item("Couple d")).getByText("Draft")).toBeInTheDocument();
    expect(within(item("Couple l")).getByText("Live")).toBeInTheDocument();
    expect(within(item("Couple c")).getByText("Changes not live")).toBeInTheDocument();
    expect(within(item("Couple d")).queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
    for (const [name, slug] of [["Couple l", "a-b"], ["Couple c", "c-d"]]) {
      const open = within(item(name)).getByRole("link", { name: "Open" });
      expect(open).toHaveAttribute("href", `/invitation/${slug}`);
      expect(open).toHaveAttribute("target", "_blank");
    }
  });

  describe("lifecycle", () => {
    const row = (id, extra) => ({ ...rows[0], id, coupleNames: `Couple ${id}`, ...extra });
    const item = (name) => screen.getByText(name).closest("li");
    const filter = () => screen.getByRole("combobox", { name: "Status" });
    const names = () => screen.queryAllByRole("link", { name: /Couple/ }).map((l) => within(l).getByText(/^Couple/).textContent);

    it("badges offline and deleted invitations, with the erase date for deleted ones", async () => {
      const list = [
        row("o", { status: "offline", slug: "o-o", offlineAt: "2026-10-01T10:00:00.000Z", purgeAt: "2026-10-31T10:00:00.000Z" }),
        row("x", { status: "deleted", deletedAt: "2026-10-02T10:00:00.000Z", purgeAt: "2026-11-01T10:00:00.000Z" }),
      ];
      render(<InvitationList rows={list} templateNames={templateNames} now={now} />);
      const offline = within(item("Couple o")).getByText("Offline");
      expect(offline).toHaveClass("bg-stone-200", "text-stone-800");
      expect(within(item("Couple o")).queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
      await userEvent.selectOptions(filter(), "deleted");
      const deleted = within(item("Couple x")).getByText("Deleted · erased on Sunday, 1 November 2026");
      expect(deleted).toHaveClass("bg-red-100", "text-red-900");
    });

    it("says a deleted invitation is being erased once its erase date has passed", async () => {
      render(<InvitationList rows={[row("x", { status: "deleted", purgeAt: "2026-10-07T10:00:00.000Z" })]} templateNames={templateNames} now={now} />);
      await userEvent.selectOptions(filter(), "deleted");
      expect(within(item("Couple x")).getByText("Deleted · erasing…")).toBeInTheDocument();
    });

    it("offers All, Draft, Live, Offline and Deleted; All hides deleted invitations", async () => {
      const list = [
        row("d", { status: "draft" }),
        row("l", { status: "published", version: 1, liveVersion: 1 }),
        row("o", { status: "offline", purgeAt: "2026-11-01T10:00:00.000Z" }),
        row("x", { status: "deleted", purgeAt: "2026-11-01T10:00:00.000Z" }),
      ];
      render(<InvitationList rows={list} templateNames={templateNames} now={now} />);
      expect(within(filter()).getAllByRole("option").map((o) => [o.value, o.textContent])).toEqual([
        ["all", "All"],
        ["draft", "Draft"],
        ["published", "Live"],
        ["offline", "Offline"],
        ["deleted", "Deleted"],
      ]);
      expect(names().sort()).toEqual(["Couple d", "Couple l", "Couple o"]);
      await userEvent.selectOptions(filter(), "deleted");
      expect(names()).toEqual(["Couple x"]);
      await userEvent.selectOptions(filter(), "offline");
      expect(names()).toEqual(["Couple o"]);
      await userEvent.selectOptions(filter(), "published");
      expect(names()).toEqual(["Couple l"]);
    });

    it("notices invitations going offline this week, linking to the Live filter", async () => {
      const list = [
        row("a", { status: "published", offlineOn: "2026-10-10" }),
        row("b", { status: "published", offlineOn: "2026-10-15" }),
        row("c", { status: "published", offlineOn: "2026-12-01" }),
        row("d", { status: "draft" }),
      ];
      render(<InvitationList rows={list} templateNames={templateNames} now={now} />);
      expect(screen.queryByRole("button", { name: /will be erased/ })).not.toBeInTheDocument();
      await userEvent.selectOptions(filter(), "draft");
      await userEvent.click(screen.getByRole("button", { name: "2 invitations go offline in the next 7 days" }));
      expect(filter()).toHaveValue("published");
    });

    it("notices invitations erased within a day, linking to Deleted when any of them is deleted", async () => {
      const soon = "2026-10-09T06:00:00.000Z";
      const list = [
        row("o", { status: "offline", purgeAt: soon }),
        row("x", { status: "deleted", purgeAt: soon }),
        row("y", { status: "deleted", purgeAt: "2026-10-20T06:00:00.000Z" }),
      ];
      render(<InvitationList rows={list} templateNames={templateNames} now={now} />);
      expect(screen.queryByRole("button", { name: /go offline/ })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "2 will be erased in the next 24 hours" }));
      expect(filter()).toHaveValue("deleted");
    });

    it("links the erase notice to Offline when only offline invitations are due", async () => {
      const list = [row("o", { status: "offline", purgeAt: "2026-10-09T06:00:00.000Z" })];
      render(<InvitationList rows={list} templateNames={templateNames} now={now} />);
      await userEvent.click(screen.getByRole("button", { name: "1 will be erased in the next 24 hours" }));
      expect(filter()).toHaveValue("offline");
    });

    it("says one invitation in the singular", () => {
      render(<InvitationList rows={[row("a", { status: "published", offlineOn: "2026-10-09" })]} templateNames={templateNames} now={now} />);
      expect(screen.getByRole("button", { name: "1 invitation goes offline in the next 7 days" })).toBeInTheDocument();
    });

    it("shows no notices when nothing is due", () => {
      render(<InvitationList rows={rows} templateNames={templateNames} now={now} />);
      expect(screen.queryByRole("button", { name: /go offline|will be erased/ })).not.toBeInTheDocument();
    });
  });

  describe("row actions", () => {
    const row = (id, extra) => ({ ...rows[0], id, coupleNames: `Couple ${id}`, version: 7, ...extra });
    const live = row("l", { status: "published", liveVersion: 7, slug: "l-l" });
    const changes = row("c", { status: "published", liveVersion: 6, slug: "c-c" });
    const draft = row("d", { status: "draft" });
    const offline = row("o", { status: "offline", slug: "o-o", purgeAt: "2026-11-01T10:00:00.000Z" });
    const deleted = row("x", { status: "deleted", purgeAt: "2026-11-01T10:00:00.000Z" });
    const item = (name) => screen.getByText(name).closest("li");
    const filter = () => screen.getByRole("combobox", { name: "Status" });
    const setup = (list, actions = {}) => {
      const all = {
        takeOfflineAction: vi.fn(),
        deleteInvitationAction: vi.fn(),
        restoreInvitationAction: vi.fn(),
        ...actions,
      };
      render(<InvitationList rows={list} templateNames={templateNames} now={now} actions={all} />);
      return all;
    };
    const confirm = (answer) => vi.spyOn(window, "confirm").mockReturnValue(answer);
    afterEach(() => vi.restoreAllMocks());

    it("shows Take offline on live and changes rows, Delete on all but deleted, Restore only on deleted", async () => {
      setup([live, changes, draft, offline, deleted]);
      const has = (name, label) => within(item(name)).queryByRole("button", { name: label }) !== null;
      expect(["l", "c", "d", "o"].map((k) => has(`Couple ${k}`, "Take offline"))).toEqual([true, true, false, false]);
      expect(["l", "c", "d", "o"].map((k) => has(`Couple ${k}`, "Delete"))).toEqual([true, true, true, true]);
      expect(["l", "c", "d", "o"].map((k) => has(`Couple ${k}`, "Restore"))).toEqual([false, false, false, false]);
      await userEvent.selectOptions(filter(), "deleted");
      expect(has("Couple x", "Delete")).toBe(false);
      expect(has("Couple x", "Take offline")).toBe(false);
      expect(has("Couple x", "Restore")).toBe(true);
    });

    it("makes no call when the confirm is declined", async () => {
      const a = setup([live]);
      const spy = confirm(false);
      await userEvent.click(screen.getByRole("button", { name: "Take offline" }));
      expect(spy).toHaveBeenCalledWith(TAKE_OFFLINE_CONFIRM);
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(spy).toHaveBeenCalledWith(deleteConfirm());
      expect(a.takeOfflineAction).not.toHaveBeenCalled();
      expect(a.deleteInvitationAction).not.toHaveBeenCalled();
    });

    it("takes a row offline and updates its badge", async () => {
      const a = setup([live], { takeOfflineAction: vi.fn(async () => ({ ok: true, status: "offline", offlineAt: "2026-10-08T12:00:00.000Z", purgeAt: "2026-11-07T12:00:00.000Z" })) });
      confirm(true);
      await userEvent.click(screen.getByRole("button", { name: "Take offline" }));
      expect(a.takeOfflineAction).toHaveBeenCalledWith({ id: "l", expectedVersion: 7 });
      expect(await within(item("Couple l")).findByText("Offline")).toBeInTheDocument();
      expect(within(item("Couple l")).queryByRole("button", { name: "Take offline" })).not.toBeInTheDocument();
    });

    it("deletes a row: gone from All, present under Deleted with its Restore button", async () => {
      const a = setup([live], { deleteInvitationAction: vi.fn(async () => ({ ok: true, status: "deleted", deletedAt: "2026-10-08T12:00:00.000Z", purgeAt: "2026-11-07T12:00:00.000Z" })) });
      confirm(true);
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(a.deleteInvitationAction).toHaveBeenCalledWith({ id: "l", expectedVersion: 7 });
      expect(await screen.findByText("No invitations match your search.")).toBeInTheDocument();
      await userEvent.selectOptions(filter(), "deleted");
      expect(within(item("Couple l")).getByText(/^Deleted · erased on/)).toBeInTheDocument();
      expect(within(item("Couple l")).getByRole("button", { name: "Restore" })).toBeInTheDocument();
    });

    it("restores a deleted row without asking", async () => {
      const a = setup([deleted], { restoreInvitationAction: vi.fn(async () => ({ ok: true, status: "draft", offlineAt: null, deletedAt: null, purgeAt: null })) });
      const spy = confirm(false);
      await userEvent.selectOptions(filter(), "deleted");
      await userEvent.click(screen.getByRole("button", { name: "Restore" }));
      expect(spy).not.toHaveBeenCalled();
      expect(a.restoreInvitationAction).toHaveBeenCalledWith({ id: "x", expectedVersion: 7 });
      await userEvent.selectOptions(filter(), "draft");
      expect(within(item("Couple x")).getByText("Draft")).toBeInTheDocument();
    });

    it("shows a conflict, a returned message, and the offline message on the row", async () => {
      const take = vi.fn()
        .mockResolvedValueOnce({ ok: false, conflict: true })
        .mockResolvedValueOnce({ ok: false, message: "Nope, sorry" })
        .mockRejectedValueOnce(new Error("net"));
      setup([live, draft], { takeOfflineAction: take });
      confirm(true);
      const btn = () => within(item("Couple l")).getByRole("button", { name: "Take offline" });
      await userEvent.click(btn());
      expect(await within(item("Couple l")).findByRole("alert")).toHaveTextContent("This invitation changed — reload the page.");
      expect(within(item("Couple d")).queryByRole("alert")).not.toBeInTheDocument();
      await userEvent.click(btn());
      expect(await within(item("Couple l")).findByRole("alert")).toHaveTextContent("Nope, sorry");
      await userEvent.click(btn());
      expect(await within(item("Couple l")).findByRole("alert")).toHaveTextContent(OFFLINE_MESSAGE);
      expect(within(item("Couple l")).getByText("Live")).toBeInTheDocument();
    });

    it("disables that row's buttons while a request is pending", async () => {
      let finish;
      setup([live, changes], { takeOfflineAction: vi.fn(() => new Promise((r) => { finish = r; })) });
      confirm(true);
      await userEvent.click(within(item("Couple l")).getByRole("button", { name: "Take offline" }));
      expect(within(item("Couple l")).getByRole("button", { name: "Take offline" })).toBeDisabled();
      expect(within(item("Couple l")).getByRole("button", { name: "Delete" })).toBeDisabled();
      expect(within(item("Couple c")).getByRole("button", { name: "Delete" })).toBeEnabled();
      finish({ ok: false, message: "x" });
      await within(item("Couple l")).findByRole("alert");
      expect(within(item("Couple l")).getByRole("button", { name: "Delete" })).toBeEnabled();
    });

    it("sends staff to the editor when a restore needs a new offline date", async () => {
      setup([deleted], { restoreInvitationAction: vi.fn(async () => ({ ok: false, message: "Pick a date after today" })) });
      await userEvent.selectOptions(filter(), "deleted");
      await userEvent.click(screen.getByRole("button", { name: "Restore" }));
      const li = item("Couple x");
      expect(await within(li).findByRole("alert")).toHaveTextContent("Pick a date after today");
      expect(within(li).getByRole("link", { name: "Open it to choose a date" })).toHaveAttribute("href", "/admin/invitations/x/edit");
    });
  });

  it("invites staff to create the first invitation", () => {
    render(<InvitationList rows={[]} templateNames={templateNames} now={now} />);
    expect(screen.getByText("No invitations yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New invitation" })).toHaveAttribute("href", "/admin/invitations/new");
  });
});
