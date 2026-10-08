import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewInvitationForm from "./NewInvitationForm";

const templates = [
  { id: "royal", name: "Royal Rajasthani", description: "Maroon and gold.", palettes: [{ id: "maroon-gold", name: "Maroon & Gold", bg: "#fff", primary: "#800" }, { id: "ivory", name: "Ivory", bg: "#ffe", primary: "#a80" }] },
  { id: "floral", name: "Floral Pastel", description: "Soft florals.", palettes: [{ id: "blush", name: "Blush", bg: "#fee", primary: "#c88" }] },
];

describe("NewInvitationForm", () => {
  it("creates with the first template, palette and English by default", async () => {
    const createAction = vi.fn(() => new Promise(() => {}));
    render(<NewInvitationForm templates={templates} createAction={createAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(createAction).toHaveBeenCalledWith({ templateId: "royal", palette: "maroon-gold", language: "en" });
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });

  it("switches to the new template's first palette when the template changes", async () => {
    const createAction = vi.fn(() => new Promise(() => {}));
    render(<NewInvitationForm templates={templates} createAction={createAction} />);
    await userEvent.click(screen.getByRole("button", { name: /Floral Pastel/ }));
    await userEvent.click(screen.getByRole("button", { name: "Both" }));
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(createAction).toHaveBeenCalledWith({ templateId: "floral", palette: "blush", language: "both" });
  });

  it("previews the current choice", async () => {
    render(<NewInvitationForm templates={templates} createAction={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Ivory" }));
    expect(screen.getByTitle("Royal Rajasthani preview")).toHaveAttribute("src", "/preview/template/royal?palette=ivory&lang=en");
  });

  it("shows why creating failed", async () => {
    const createAction = vi.fn(async () => ({ ok: false, message: "Couldn't create the invitation. Please try again." }));
    render(<NewInvitationForm templates={templates} createAction={createAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create the invitation. Please try again.");
    expect(screen.getByRole("button", { name: "Create invitation" })).toBeEnabled();
  });
});
