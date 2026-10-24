import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvitationRenderer from "../../InvitationRenderer";
import { parseInvitation } from "../../schema/invitation";
import { getTemplate } from "../registry";

const base = getTemplate("royal").sample;
const invitation = parseInvitation({
  ...base,
  language: "en",
  rsvp: { ...base.rsvp, deadline: undefined, askGuestCount: false, askMeal: false },
  hosts: { ...base.hosts, contactPhone: "+91 98765 43210" },
});

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, updated: false }) });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "open").mockImplementation(() => ({ location: "", close: vi.fn() }));
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function reply(ctx) {
  render(<InvitationRenderer invitation={invitation} ctx={{ skipOpening: true, ...ctx }} />);
  await act(async () => {});
  await userEvent.type(screen.getByLabelText("Name"), "Sharma Parivar");
  await userEvent.type(screen.getByLabelText("Phone"), "9876543210");
  await userEvent.click(screen.getByLabelText("Not sure yet"));
  await userEvent.click(screen.getByRole("button", { name: "Send RSVP on WhatsApp" }));
  await act(async () => {});
}

describe("RSVP section wiring", () => {
  it("saves nothing in the editor preview", async () => {
    await reply({ mode: "preview", slug: "meera-weds-arjun" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank", "noopener,noreferrer");
  });

  it("saves nothing in any mode other than live", async () => {
    await reply({ mode: "print", slug: "meera-weds-arjun" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves nothing on a live page without a slug", async () => {
    await reply({ mode: "live" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs { slug, reply } to /api/rsvp on a live page with a slug", async () => {
    await reply({ mode: "live", slug: "meera-weds-arjun" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/rsvp");
    expect(JSON.parse(init.body)).toEqual({
      slug: "meera-weds-arjun",
      reply: { name: "Sharma Parivar", phone: "9876543210", attending: "maybe", eventIds: [] },
    });
    expect(screen.getByText("Your reply is saved. Send it on WhatsApp to let the family know personally.")).toBeInTheDocument();
  });
});
