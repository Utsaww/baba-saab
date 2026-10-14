import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/AdminModule/media/storage", () => ({
  uploadMedia: vi.fn(async ({ key }) => key),
  deleteMedia: vi.fn(async () => {}),
}));
vi.mock("@/AdminModule/media/photos", () => ({
  preparePhoto: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })),
}));

import EditorShell from "./EditorShell";
import { COMPLETE_CONTENT, renderEditor, TEMPLATE_CHOICES } from "./test-utils";

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
  it("shows the live preview", () => {
    renderShell(vi.fn());
    expect(screen.getByTitle("Live preview")).toHaveAttribute("src", "/admin/preview-frame");
  });

  it("toggles the preview on small screens via a controlled button", () => {
    renderShell(vi.fn());
    const button = screen.getByRole("button", { name: "Preview" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(button.getAttribute("aria-controls"))).toBe(screen.getByLabelText("Live preview", { selector: "aside" }));
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Hide preview" })).toHaveAttribute("aria-expanded", "true");
  });

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

  it("keeps the step in the address bar without touching the router's history state", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    renderShell(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(replace).toHaveBeenLastCalledWith(null, "", expect.any(URL));
    replace.mockRestore();
  });

  it("does not ask before a link while edits are waiting to be saved, but warns on close", () => {
    const confirm = vi.spyOn(window, "confirm");
    renderShell(vi.fn(async () => ({ ok: true, version: 6, savedAt: "x" })));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    const close = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(close);
    expect(close.defaultPrevented).toBe(true);
    const stop = (event) => event.preventDefault();
    document.addEventListener("click", stop);
    fireEvent.click(screen.getByRole("link", { name: /All invitations/ }));
    document.removeEventListener("click", stop);
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("asks before a link when the latest changes couldn't be saved", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderShell(vi.fn(async () => ({ ok: false, message: "Couldn't save." })));
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    await act(async () => vi.advanceTimersByTime(3000));
    const stop = (event) => event.preventDefault();
    document.addEventListener("click", stop);
    fireEvent.click(screen.getByRole("link", { name: /All invitations/ }));
    document.removeEventListener("click", stop);
    expect(confirm).toHaveBeenCalledWith("Your latest changes couldn't be saved and will be lost. Leave this page anyway?");
    confirm.mockRestore();
  });

  it("saves pending edits before signing out", async () => {
    const saveAction = vi.fn().mockResolvedValueOnce({ ok: true, version: 6, savedAt: "x" });
    renderShell(saveAction);
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priya" } });
    const waits = [];
    const event = new CustomEvent("admin:before-signout", { cancelable: true, detail: { waitFor: (p) => waits.push(p) } });
    let proceed;
    await act(async () => {
      proceed = window.dispatchEvent(event);
      await Promise.all(waits);
    });
    expect(proceed).toBe(true);
    expect(waits).toHaveLength(1);
    expect(saveAction).toHaveBeenCalledTimes(1);
    // The save went through, so the final navigation must not raise the browser's "Leave site?" prompt.
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });

  it("asks before signing out when the latest changes couldn't be saved", async () => {
    const saveAction = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." });
    renderShell(saveAction);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priyanka" } });
    await act(async () => vi.advanceTimersByTime(3000));
    let cancelled;
    act(() => {
      cancelled = window.dispatchEvent(new CustomEvent("admin:before-signout", { cancelable: true, detail: { waitFor() {} } }));
    });
    expect(cancelled).toBe(false);
    confirm.mockRestore();
  });

  it("links each step to its help section", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("link", { name: /Help for this step/ })).toHaveAttribute("href", "/admin/help#editor-step-2-couple-families");
  });
});

describe("EditorShell media", () => {
  it("deletes a removed photo only after the save that drops it succeeds", async () => {
    const { deleteMedia } = await import("@/AdminModule/media/storage");
    const withCover = { ...invitation, content: { ...invitation.content, media: { coverKey: "invitations/inv-1/old.jpg" } } };
    const saveAction = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." }).mockResolvedValueOnce({ ok: true, version: 6, savedAt: "x" });
    render(<EditorShell invitation={withCover} initialStep={5} templates={TEMPLATE_CHOICES} saveAction={saveAction} />);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(deleteMedia).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(deleteMedia).toHaveBeenCalledWith(["invitations/inv-1/old.jpg"]);
  });

  it("warns before closing the tab while a photo is uploading", async () => {
    const { preparePhoto } = await import("@/AdminModule/media/photos");
    preparePhoto.mockImplementationOnce(() => new Promise(() => {}));
    render(<EditorShell invitation={invitation} initialStep={5} templates={TEMPLATE_CHOICES} saveAction={vi.fn()} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Choose cover photo"), { target: { files: [new File(["x"], "c.jpg", { type: "image/jpeg" })] } });
    });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("EditorShell upload ordering across steps", () => {
  it("keeps the newest cover even when the step was left and re-entered in between", async () => {
    const storage = await import("@/AdminModule/media/storage");
    const resolvers = [];
    storage.uploadMedia.mockImplementation(({ key }) => new Promise((resolve) => resolvers.push(() => resolve(key))));
    const saveAction = vi.fn(async () => ({ ok: true, version: 6, savedAt: "x" }));
    render(<EditorShell invitation={invitation} initialStep={5} templates={TEMPLATE_CHOICES} saveAction={saveAction} />);
    const pickCover = async (name) => {
      await act(async () => {
        fireEvent.change(screen.getByLabelText("Choose cover photo"), { target: { files: [new File(["x"], name, { type: "image/jpeg" })] } });
      });
    };
    await pickCover("a.jpg");
    fireEvent.click(screen.getByRole("button", { name: /6\./ }));
    fireEvent.click(screen.getByRole("button", { name: /5\./ }));
    await pickCover("b.jpg");
    const keys = storage.uploadMedia.mock.calls.map(([args]) => args.key);
    const [keyA, keyB] = keys.slice(-2);
    await act(async () => resolvers[resolvers.length - 1]()); // B first
    await act(async () => resolvers[resolvers.length - 2]()); // A last
    await act(async () => vi.advanceTimersByTime(3000));
    expect(saveAction).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.objectContaining({ media: expect.objectContaining({ coverKey: keyB }) }) }));
    expect(keyA).not.toBe(keyB);
    storage.uploadMedia.mockImplementation(async ({ key }) => key);
  });
});

describe("EditorShell upload leave message", () => {
  it("says a photo is still uploading when that is the only risk", async () => {
    const { preparePhoto } = await import("@/AdminModule/media/photos");
    preparePhoto.mockImplementationOnce(() => new Promise(() => {}));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<EditorShell invitation={invitation} initialStep={5} templates={TEMPLATE_CHOICES} saveAction={vi.fn()} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Choose cover photo"), { target: { files: [new File(["x"], "c.jpg", { type: "image/jpeg" })] } });
    });
    const stop = (event) => event.preventDefault();
    document.addEventListener("click", stop);
    fireEvent.click(screen.getByRole("link", { name: /All invitations/ }));
    document.removeEventListener("click", stop);
    expect(confirm).toHaveBeenCalledWith("A photo or song is still uploading. Leave this page anyway?");
    confirm.mockRestore();
  });
});

describe("EditorShell publishing", () => {
  const COVER = "invitations/inv-test/a.jpg";
  const withCover = { ...COMPLETE_CONTENT, media: { coverKey: COVER } };
  const published = { status: "published", version: 5, liveVersion: 5, content: withCover, publishedContent: withCover };
  // Lets chains of resolved promises (save, then publish) finish.
  const settle = async () => {
    for (let i = 0; i < 5; i += 1) await act(async () => {});
  };
  const goToReview = () => fireEvent.click(screen.getByRole("button", { name: /8\. Review/ }));
  let storage;

  beforeEach(async () => {
    storage = await import("@/AdminModule/media/storage");
    storage.deleteMedia.mockClear();
  });

  it("keeps a file the live copy still uses, and deletes it once Update live drops it", async () => {
    const { publishActions } = renderEditor({ invitation: published, initialStep: 5 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Saved 10:30")).toBeInTheDocument();
    expect(storage.deleteMedia).not.toHaveBeenCalled();

    goToReview();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Update live invitation" })));
    await settle();
    expect(publishActions.updateLiveAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 6 });
    expect(storage.deleteMedia).toHaveBeenCalledWith([COVER]);
    expect(screen.queryByText("You have changes guests can't see yet")).not.toBeInTheDocument();
  });

  it("saves pending edits before publishing and sends the version that save produced", async () => {
    const { publishActions, saveAction } = renderEditor();
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priyanka" } });
    goToReview();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(publishActions.publishAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 6, slug: "priya-weds-rahul-k3f9" });
    expect(screen.getByText("http://localhost:3000/invitation/priya-weds-rahul-k3f9")).toBeInTheDocument();
    expect(screen.getByLabelText("Link name")).toHaveAttribute("readonly");
  });

  it("tells staff about changes guests can't see yet on every step", () => {
    renderEditor({ invitation: { ...published, version: 6 } });
    expect(screen.getByText("You have changes guests can't see yet")).toBeInTheDocument();
  });

  it("shows a conflict when someone else saved before publishing", async () => {
    renderEditor({ initialStep: 8, publishActions: { publishAction: vi.fn(async () => ({ ok: false, conflict: true })) } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else — reload the page.");
  });

  it("shows what the server says is missing", async () => {
    const publishAction = vi.fn(async () => ({ ok: false, message: "Some details are still missing.", missing: ["Add the venue"] }));
    renderEditor({ initialStep: 8, publishActions: { publishAction } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent("Some details are still missing. Add the venue");
  });

  it("claims a link name from the couple's names on reaching Review", async () => {
    const { publishActions } = renderEditor({ invitation: { slug: null } });
    goToReview();
    await settle();
    expect(publishActions.setSlugAction).toHaveBeenCalledTimes(1);
    expect(publishActions.setSlugAction.mock.calls[0][0].slug).toMatch(/^priya-weds-rahul-[a-z2-9]{4}$/);
    expect(screen.getByLabelText("Link name").value).toMatch(/^priya-weds-rahul-[a-z2-9]{4}$/);
  });

  it("never deletes a file the copy being sent live uses, even when a save finishes during the request", async () => {
    let finish;
    const updateLiveAction = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    const { saveAction } = renderEditor({ invitation: { ...published, version: 6 }, publishActions: { updateLiveAction } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Update live invitation" })));
    await settle();
    expect(updateLiveAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 6 });
    // While the request runs, staff remove the cover and the autosave stores that.
    fireEvent.click(screen.getByRole("button", { name: /5\./ }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(storage.deleteMedia).not.toHaveBeenCalled();
    await act(async () => finish({ ok: true, liveVersion: 6 }));
    await settle();
    // Guests now see version 6, which still shows the cover.
    expect(storage.deleteMedia).not.toHaveBeenCalled();
    expect(screen.getByText("You have changes guests can't see yet")).toBeInTheDocument();
  });

  it("does not delete a file the copy being published uses when a save finishes during the request", async () => {
    let finish;
    const publishAction = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    renderEditor({ invitation: { content: withCover }, initialStep: 8, publishActions: { publishAction } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /5\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    await act(async () => finish({ ok: true, status: "published", slug: "priya-weds-rahul-k3f9", liveVersion: 5 }));
    await settle();
    expect(storage.deleteMedia).not.toHaveBeenCalled();
  });

  it("shows header Update live errors on any step, and sends one request for a double click", async () => {
    let finish;
    const updateLiveAction = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    renderEditor({ invitation: { ...published, version: 6 }, publishActions: { updateLiveAction } });
    const button = screen.getByRole("button", { name: "Update live invitation" });
    await act(async () => fireEvent.click(button));
    await act(async () => fireEvent.click(button));
    await settle();
    expect(button).toBeDisabled();
    expect(updateLiveAction).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: false, message: "Some details are still missing.", missing: ["Add the venue"] }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("Some details are still missing. Add the venue");
    expect(button).toBeEnabled();
  });

  it("says the server couldn't be reached when an action call fails", async () => {
    renderEditor({ initialStep: 8, publishActions: { publishAction: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server. Check your connection and try again.");
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("tries a second generated name when the first was just taken", async () => {
    const setSlugAction = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "That link name was just taken — try another." })
      .mockImplementationOnce(async ({ slug }) => ({ ok: true, slug }));
    renderEditor({ invitation: { slug: null }, initialStep: 8, publishActions: { setSlugAction } });
    await settle();
    expect(setSlugAction).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
