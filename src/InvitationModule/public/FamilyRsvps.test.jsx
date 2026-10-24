import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { familyNote, toCsv } from "@/InvitationModule/lib/rsvpList";
import FamilyRsvps from "./FamilyRsvps";

const events = [
  { id: "haldi", name: { en: "Haldi" } },
  { id: "sangeet", name: { en: "Sangeet" } },
];
const data = {
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } }, order: "bride-first" },
  language: "en",
  events,
  rows: [
    { rsvpKey: "919876543210#asha", phoneKey: "919876543210", name: "Asha", phone: "+91 98765 43210", attending: "yes", guestCount: 3, eventIds: ["haldi"], source: "guest", updatedAt: "2026-10-20T10:00:00.000Z" },
    { rsvpKey: "919876543210#ravi", phoneKey: "919876543210", name: "Ravi", phone: "9876543210", attending: "yes", eventIds: [], source: "guest", updatedAt: "2026-10-22T10:00:00.000Z" },
    { rsvpKey: "919811111111#meena", phoneKey: "919811111111", name: "Meena", phone: "9811111111", attending: "maybe", guestCount: 2, eventIds: [], source: "guest", updatedAt: "2026-10-21T10:00:00.000Z" },
  ],
};
const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

afterEach(() => vi.restoreAllMocks());

describe("FamilyRsvps", () => {
  it("shows the couple, totals, per-event headcounts and phone numbers", () => {
    render(<FamilyRsvps slug="priya-rahul" data={data} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Priya & Rahul");
    const totals = within(screen.getByRole("region", { name: "Totals" }));
    expect(totals.getByText("People coming").nextSibling.textContent).toBe("4");
    expect(totals.getByText("Haldi").nextSibling.textContent).toBe("4");
    expect(totals.getByText("Sangeet").nextSibling.textContent).toBe("1");
    expect(within(screen.getByRole("table")).getByText("+91 98765 43210")).toBeTruthy();
  });

  it("follows the couple's order", () => {
    render(<FamilyRsvps slug="s" data={{ ...data, couple: { ...data.couple, order: "groom-first" } }} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Rahul & Priya");
  });

  it("marks replies that share a phone", () => {
    render(<FamilyRsvps slug="s" data={data} />);
    expect(screen.getAllByRole("img", { name: familyNote(["Asha"]) }).length).toBeGreaterThan(0);
  });

  it("searches and filters by event", async () => {
    render(<FamilyRsvps slug="s" data={data} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search replies" }), "meena");
    expect(bodyRows()).toHaveLength(1);
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search replies" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Event" }), "sangeet");
    expect(bodyRows()).toHaveLength(2); // Ravi and Meena have no events, so they count for every event
  });

  it("has no edit, remove, add or family-link controls", () => {
    render(<FamilyRsvps slug="s" data={data} />);
    expect(screen.queryByRole("button", { name: /edit|remove|add reply/i })).toBeNull();
    expect(screen.queryByText(/family link/i)).toBeNull();
  });

  it("downloads the CSV named after the slug", async () => {
    let blob;
    URL.createObjectURL = vi.fn((b) => ((blob = b), "blob:x"));
    URL.revokeObjectURL = vi.fn();
    let name;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      name = this.download;
    });
    render(<FamilyRsvps slug="priya-rahul" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(name).toBe("priya-rahul-rsvps.csv");
    const read = (how) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader[how](blob);
      });
    const sorted = [...data.rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    expect((await read("readAsText")).replace(/^﻿/, "")).toBe(toCsv(sorted, events, "en").replace(/^﻿/, ""));
    expect([...new Uint8Array(await read("readAsArrayBuffer")).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("shows a calm empty state", () => {
    render(<FamilyRsvps slug="s" data={{ ...data, rows: [] }} />);
    expect(screen.getByText("No replies yet.")).toBeTruthy();
  });
});
