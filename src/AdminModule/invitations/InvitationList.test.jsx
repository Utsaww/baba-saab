import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  it("invites staff to create the first invitation", () => {
    render(<InvitationList rows={[]} templateNames={templateNames} now={now} />);
    expect(screen.getByText("No invitations yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New invitation" })).toHaveAttribute("href", "/admin/invitations/new");
  });
});
