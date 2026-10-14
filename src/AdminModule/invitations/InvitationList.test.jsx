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

  it("invites staff to create the first invitation", () => {
    render(<InvitationList rows={[]} templateNames={templateNames} now={now} />);
    expect(screen.getByText("No invitations yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New invitation" })).toHaveAttribute("href", "/admin/invitations/new");
  });
});
