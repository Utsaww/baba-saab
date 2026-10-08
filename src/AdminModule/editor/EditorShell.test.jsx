import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import EditorShell from "./EditorShell";
import { TEMPLATE_CHOICES } from "./test-utils";

const invitation = {
  id: "inv-1",
  version: 5,
  content: { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" },
};

const renderShell = (saveAction, initialStep = 2) =>
  render(<EditorShell invitation={invitation} initialStep={initialStep} templates={TEMPLATE_CHOICES} saveAction={saveAction} />);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("EditorShell", () => {
  it("opens on the requested step and moves between steps", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("heading", { name: "2. Couple & families" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "3. Date, venue & travel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /8\. Review/ }));
    expect(screen.getByRole("heading", { name: "8. Review" })).toBeInTheDocument();
    expect(window.location.search).toContain("step=8");
  });

  it("auto-saves edits with the invitation id and version", async () => {
    const saveAction = vi.fn(async () => ({ ok: true, version: 6, savedAt: "2026-10-08T05:12:00.000Z" }));
    renderShell(saveAction);
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(saveAction).toHaveBeenCalledWith({
      id: "inv-1",
      expectedVersion: 5,
      content: { ...invitation.content, couple: { bride: { name: { en: "Priya" } } } },
    });
    expect(screen.getByText("Saved 10:42")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Priya");
  });

  it("shows a Retry banner when saving fails", async () => {
    const saveAction = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." }).mockResolvedValueOnce({ ok: true, version: 6, savedAt: "x" });
    renderShell(saveAction);
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(saveAction).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells staff when someone else saved first", async () => {
    renderShell(vi.fn(async () => ({ ok: false, conflict: true })));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("links each step to its help section", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("link", { name: /Help for this step/ })).toHaveAttribute("href", "/admin/help#editor-step-2-couple-families");
  });
});
