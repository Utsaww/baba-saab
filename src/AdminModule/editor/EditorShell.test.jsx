import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
vi.mock("@/AdminModule/media/storage", () => ({
  uploadMedia: vi.fn(async ({ key }) => key),
  deleteMedia: vi.fn(async () => {}),
}));
vi.mock("@/AdminModule/media/photos", () => ({
  preparePhoto: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })),
}));

import EditorShell from "./EditorShell";
import { COMPLETE_CONTENT, renderEditor, TEMPLATE_CHOICES } from "./test-utils";
import { addDays, todayIST } from "@/InvitationModule/lib/lifecycle";

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
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else — reload to see their changes.");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("shows the conflict banner with Reload when Update live meets a newer version", async () => {
    renderEditor({ invitation: { ...published, version: 6 }, publishActions: { updateLiveAction: vi.fn(async () => ({ ok: false, conflict: true })) } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Update live invitation" })));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else — reload to see their changes.");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("lists what the server says is missing, each linked to the step that fixes it", async () => {
    const publishAction = vi.fn(async () => ({
      ok: false,
      message: "Some details are still missing.",
      missing: [{ message: "Add the venue name", step: 3 }, { message: "Add the groom's name", step: 2 }],
    }));
    renderEditor({ initialStep: 8, publishActions: { publishAction } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Some details are still missing.");
    const items = within(alert).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Add the venue nameGo to step 3", "Add the groom's nameGo to step 2"]);
    fireEvent.click(within(alert).getByRole("button", { name: "Go to step 3" }));
    expect(screen.getByRole("heading", { name: "3. Date, venue & travel" })).toBeInTheDocument();
  });

  it("shows the new link name in the preview link when publishing fails after saving it", async () => {
    const publishAction = vi.fn(async () => ({ ok: false, message: "Couldn't publish. Check your connection and try again.", slug: "priya-rahul" }));
    renderEditor({ initialStep: 8, publishActions: { publishAction } });
    fireEvent.change(screen.getByLabelText("Link name"), { target: { value: "priya-rahul" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    expect(screen.getByText("http://localhost:3000/invitation/priya-rahul?preview=tok_1")).toBeInTheDocument();
    expect(screen.queryByText(/invitation\/priya-weds-rahul-k3f9/)).not.toBeInTheDocument();
  });

  it("keeps the files of a copy whose Update live outcome is unknown, even after a save drops them", async () => {
    const live = COMPLETE_CONTENT; // what guests saw before: no cover
    const updateLiveAction = vi.fn(async () => Promise.reject(new TypeError("Failed to fetch")));
    renderEditor({ invitation: { ...published, version: 6, publishedContent: live }, publishActions: { updateLiveAction } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Update live invitation" })));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server.");
    // The request may still have made the copy with the cover live; staff now remove the cover.
    fireEvent.click(screen.getByRole("button", { name: /5\./ }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    await settle();
    expect(screen.getByText("Saved 10:30")).toBeInTheDocument();
    expect(storage.deleteMedia).not.toHaveBeenCalled();
  });

  it("keeps the files of a copy whose publish outcome is unknown", async () => {
    const publishAction = vi.fn(async () => ({ ok: false, message: "Couldn't publish. Check your connection and try again." }));
    renderEditor({ invitation: { content: withCover }, initialStep: 8, publishActions: { publishAction } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /5\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    await settle();
    expect(storage.deleteMedia).not.toHaveBeenCalled();
  });

  it("deletes a dropped file as usual after a definite refusal", async () => {
    const updateLiveAction = vi.fn(async () => ({ ok: false, message: "Some details are still missing.", missing: [{ message: "Add the venue name", step: 3 }] }));
    renderEditor({ invitation: { ...published, version: 6, publishedContent: COMPLETE_CONTENT }, publishActions: { updateLiveAction } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Update live invitation" })));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /5\./ }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    confirm.mockRestore();
    await act(async () => vi.advanceTimersByTime(3000));
    await settle();
    expect(storage.deleteMedia).toHaveBeenCalledWith([COVER]);
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
    await act(async () => finish({ ok: false, message: "Some details are still missing.", missing: [{ message: "Add the venue name", step: 3 }] }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("Some details are still missing.");
    expect(within(screen.getByRole("alert")).getByRole("button", { name: "Go to step 3" })).toBeInTheDocument();
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

describe("EditorShell lifecycle", () => {
  const published = { status: "published", version: 5, liveVersion: 5, publishedContent: COMPLETE_CONTENT, offlineOn: "2027-02-21" };
  const offline = { ...published, status: "offline", offlineOn: "2026-10-01", offlineAt: "2026-10-02T05:00:00.000Z", purgeAt: "2026-11-01T05:00:00.000Z" };
  const deleted = { status: "deleted", deletedAt: "2026-10-05T05:00:00.000Z", purgeAt: "2026-11-04T05:00:00.000Z" };
  const settle = async () => {
    for (let i = 0; i < 5; i += 1) await act(async () => {});
  };
  const menu = async (name) => {
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name })));
    await settle();
    confirm.mockRestore();
  };
  const banner = () => screen.queryByText(/will be erased on/);

  it("takes a live invitation offline, saving pending edits first, and shows the offline banner", async () => {
    const { lifecycleActions, saveAction } = renderEditor({ invitation: published });
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priyanka" } });
    await menu("Take offline now");
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(lifecycleActions.takeOfflineAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 6 });
    expect(banner()).toHaveTextContent("Offline since Wednesday, 14 October 2026 — will be erased on Friday, 13 November 2026");
    // Editing still works while offline.
    expect(screen.getByLabelText("Bride's name")).toBeEnabled();
  });

  it("puts an offline invitation back online with a date after today", async () => {
    const { lifecycleActions } = renderEditor({ invitation: offline });
    expect(banner()).toHaveTextContent("Offline since Friday, 2 October 2026");
    fireEvent.click(screen.getByRole("button", { name: "Put back online" }));
    const date = addDays(todayIST(), 3);
    fireEvent.change(screen.getByLabelText("Take offline on"), { target: { value: date } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Put online" })));
    await settle();
    expect(lifecycleActions.putOnlineAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 5, offlineOn: date });
    expect(banner()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("button", { name: "Take offline now" })).toBeInTheDocument();
  });

  it("makes a deleted invitation read-only, and Restore returns it to how it was", async () => {
    const { lifecycleActions, saveAction } = renderEditor({ invitation: { ...published, version: 6 } });
    expect(screen.getByText("You have changes guests can't see yet")).toBeInTheDocument();
    await menu("Delete");
    expect(lifecycleActions.deleteInvitationAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 6 });
    expect(banner()).toHaveTextContent("Deleted — will be erased on Friday, 13 November 2026");
    expect(screen.queryByText("You have changes guests can't see yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Next/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    const bride = screen.getByLabelText("Bride's name");
    expect(bride.closest("fieldset")).toBeDisabled();
    fireEvent.change(bride, { target: { value: "Someone else" } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(saveAction).not.toHaveBeenCalled();
    expect(bride).toHaveValue("Priya");

    lifecycleActions.restoreInvitationAction.mockResolvedValueOnce({ ok: true, status: "published", purgeAt: null });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Restore" })));
    await settle();
    expect(lifecycleActions.restoreInvitationAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 6 });
    expect(banner()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bride's name").closest("fieldset")).toBeEnabled();
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
    expect(screen.getByText("You have changes guests can't see yet")).toBeInTheDocument();
  });

  it("hides the publish actions of a deleted invitation", () => {
    renderEditor({ invitation: deleted, initialStep: 8 });
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New preview link" })).not.toBeInTheDocument();
    expect(screen.getByText("Restore this invitation to publish or share it.")).toBeInTheDocument();
  });

  it("asks for a new date when restoring to live after the offline date has passed", async () => {
    const restoreInvitationAction = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "Pick a date after today" })
      .mockResolvedValueOnce({ ok: true, status: "published", purgeAt: null });
    const { lifecycleActions } = renderEditor({ invitation: deleted, lifecycleActions: { restoreInvitationAction } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Restore" })));
    await settle();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const date = addDays(todayIST(), 2);
    fireEvent.change(screen.getByLabelText("Take offline on"), { target: { value: date } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Restore with this date" })));
    await settle();
    expect(lifecycleActions.restoreInvitationAction).toHaveBeenLastCalledWith({ id: "inv-test", expectedVersion: 5, offlineOn: date });
    expect(banner()).not.toBeInTheDocument();
  });

  it("erases at once after the link name is typed, then goes back to the list", async () => {
    const { lifecycleActions } = renderEditor({ invitation: deleted });
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently now" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Confirmation"), { target: { value: "priya-weds-rahul-k3f9" } });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    try {
      await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Erase now" })));
      await settle();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(lifecycleActions.eraseNowAction).toHaveBeenCalledWith({ id: "inv-test", confirm: "priya-weds-rahul-k3f9" });
    expect(assign).toHaveBeenCalledWith("/admin/invitations");
  });

  it("shows the conflict banner when an action meets a newer version", async () => {
    renderEditor({ invitation: published, lifecycleActions: { takeOfflineAction: vi.fn(async () => ({ ok: false, conflict: true })) } });
    await menu("Take offline now");
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else — reload to see their changes.");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(banner()).not.toBeInTheDocument();
  });

  it("shows the conflict banner when a deleted invitation's Restore meets a newer version", async () => {
    renderEditor({ invitation: deleted, lifecycleActions: { restoreInvitationAction: vi.fn(async () => ({ ok: false, conflict: true })) } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Restore" })));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("Updated by someone else — reload to see their changes.");
  });

  it("says the server couldn't be reached when an action call fails", async () => {
    const deleteInvitationAction = vi.fn(async () => Promise.reject(new TypeError("Failed to fetch")));
    renderEditor({ lifecycleActions: { deleteInvitationAction } });
    await menu("Delete");
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach the server. Check your connection and try again.");
    expect(banner()).not.toBeInTheDocument();
  });

  it("saves the take-offline date from step 7", async () => {
    const { lifecycleActions } = renderEditor({ invitation: published, initialStep: 7 });
    const field = screen.getByLabelText("Take offline on");
    expect(field).toHaveValue("2027-02-21");
    expect(screen.queryByRole("checkbox", { name: /Ask guests to RSVP/ })).not.toBeInTheDocument();
    fireEvent.change(field, { target: { value: "2027-03-01" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save date" })));
    await settle();
    expect(lifecycleActions.setOfflineOnAction).toHaveBeenCalledWith({ id: "inv-test", expectedVersion: 5, offlineOn: "2027-03-01" });
  });

  it("warns in step 7 when the take-offline date is before the last event", () => {
    renderEditor({ invitation: { ...published, offlineOn: "2027-02-10" }, initialStep: 7 });
    expect(screen.getByText("This is before the last event (Sunday, 14 February 2027)")).toBeInTheDocument();
  });

  it("shows no take-offline date for drafts", () => {
    renderEditor({ initialStep: 7 });
    expect(screen.queryByLabelText("Take offline on")).not.toBeInTheDocument();
  });

  it("fills in the take-offline date the server chose on publishing", async () => {
    renderEditor({ initialStep: 8 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })));
    await settle();
    confirm.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: /7\./ }));
    expect(screen.getByLabelText("Take offline on")).toHaveValue("2027-02-21");
  });
});
