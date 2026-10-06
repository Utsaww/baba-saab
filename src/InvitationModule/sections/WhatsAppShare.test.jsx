import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WhatsAppShare from "./WhatsAppShare";

describe("<WhatsAppShare>", () => {
  it("shares the general link without the guest code", () => {
    window.history.pushState({}, "", "/invitation/a-weds-b?g=k9f2");
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WhatsAppShare message="Aarohi & Vihaan" lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Share on WhatsApp" }));
    const sharedText = decodeURIComponent(open.mock.calls[0][0].split("text=")[1]);
    expect(sharedText).toBe("Aarohi & Vihaan\nhttp://localhost:3000/invitation/a-weds-b");
    open.mockRestore();
  });
});
