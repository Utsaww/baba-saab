import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublishPanel from "./PublishPanel";

const base = (over = {}) => ({
  live: { status: "draft", slug: "priya-weds-rahul-k3f9", previewToken: "tok_1", liveVersion: null, publishedContent: null },
  state: "draft",
  busy: false,
  error: null,
  origin: "https://www.babasaab.com",
  onSetSlug: vi.fn(async () => ({ ok: true })),
  onCheckSlug: vi.fn(async () => ({ status: "available" })),
  onPublish: vi.fn(async () => ({ ok: true })),
  onUpdateLive: vi.fn(async () => ({ ok: true })),
  onNewPreviewLink: vi.fn(async () => ({ ok: true })),
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("PublishPanel — draft", () => {
  it("shows the link name and the customer preview link", () => {
    render(<PublishPanel publishing={base()} ready content={{}} />);
    expect(screen.getByLabelText("Link name")).toHaveValue("priya-weds-rahul-k3f9");
    expect(screen.getByText("https://www.babasaab.com/invitation/priya-weds-rahul-k3f9?preview=tok_1")).toBeInTheDocument();
  });
  it("checks availability as staff type", async () => {
    const p = base({ onCheckSlug: vi.fn(async () => ({ status: "taken", message: "Already taken — try another." })) });
    render(<PublishPanel publishing={p} ready content={{}} />);
    const field = screen.getByLabelText("Link name");
    await userEvent.clear(field);
    await userEvent.type(field, "priya-rahul");
    expect(await screen.findByText("Already taken — try another.")).toBeInTheDocument();
  });
  it("offers to save an available new link name", async () => {
    const p = base();
    render(<PublishPanel publishing={p} ready content={{}} />);
    const field = screen.getByLabelText("Link name");
    await userEvent.clear(field);
    await userEvent.type(field, "Priya-Rahul");
    expect(field).toHaveValue("priya-rahul");
    expect(await screen.findByText("✓ available")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save link name" }));
    expect(p.onSetSlug).toHaveBeenCalledWith("priya-rahul");
  });
  it("disables Publish until the checklist passes", () => {
    render(<PublishPanel publishing={base()} ready={false} content={{}} />);
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });
  it("disables Publish while uploads run", () => {
    render(<PublishPanel publishing={base({ busy: true })} ready content={{}} />);
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText("Wait for uploads to finish")).toBeInTheDocument();
  });
  it("confirms before publishing, with the link name", async () => {
    const p = base();
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<PublishPanel publishing={p} ready content={{}} />);
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(p.onPublish).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(window.confirm).toHaveBeenLastCalledWith("Publish? The link name can't be changed after this.");
    expect(p.onPublish).toHaveBeenCalledWith("priya-weds-rahul-k3f9");
  });
  it("confirms before making a new preview link", async () => {
    const p = base();
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<PublishPanel publishing={p} ready content={{}} />);
    await userEvent.click(screen.getByRole("button", { name: "New preview link" }));
    expect(window.confirm).toHaveBeenLastCalledWith("The old preview link will stop working.");
    expect(p.onNewPreviewLink).toHaveBeenCalled();
  });
  it("copies a link and offers it on WhatsApp", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<PublishPanel publishing={base()} ready content={{}} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("https://www.babasaab.com/invitation/priya-weds-rahul-k3f9?preview=tok_1");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send on WhatsApp" }).getAttribute("href")).toContain(
      encodeURIComponent("https://www.babasaab.com/invitation/priya-weds-rahul-k3f9?preview=tok_1"),
    );
  });
});

describe("PublishPanel — published", () => {
  const live = { status: "published", slug: "priya-weds-rahul-k3f9", previewToken: "tok_1", liveVersion: 7, publishedContent: {} };
  it("locks the link name and offers the live link and QR", () => {
    render(<PublishPanel publishing={base({ live, state: "live" })} ready content={{}} />);
    expect(screen.getByLabelText("Link name")).toHaveAttribute("readonly");
    expect(screen.getByText("Locked after publishing so links already shared keep working.")).toBeInTheDocument();
    expect(screen.getByText("https://www.babasaab.com/invitation/priya-weds-rahul-k3f9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download QR code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });
  it("offers Update live when there are changes", async () => {
    const p = base({ live, state: "changes" });
    render(<PublishPanel publishing={p} ready content={{}} />);
    expect(screen.getByText("You have changes guests can't see yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Update live invitation" }));
    await waitFor(() => expect(p.onUpdateLive).toHaveBeenCalled());
  });
  it("disables its buttons while the editor is running a request", () => {
    render(<PublishPanel publishing={base({ live, state: "changes", pending: true })} ready content={{}} />);
    expect(screen.getByRole("button", { name: "Update live invitation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New preview link" })).toBeDisabled();
  });
  it("shows a server refusal", () => {
    render(<PublishPanel publishing={base({ live, state: "changes", error: "Some details are still missing." })} ready content={{}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Some details are still missing.");
  });
});
