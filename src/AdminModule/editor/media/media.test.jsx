import { describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// vi.mock factories run before ordinary top-level code, so shared state must be created with vi.hoisted.
const pending = vi.hoisted(() => new Map());
vi.mock("@/AdminModule/media/photos", () => ({
  preparePhoto: vi.fn(async (file) => new Blob([file.name], { type: "image/jpeg" })),
}));
vi.mock("@/AdminModule/media/storage", () => ({
  uploadMedia: vi.fn(({ key, blob }) => {
    const name = blob instanceof Blob && blob.type === "audio/mpeg" ? "song" : "photo";
    return new Promise((resolve) => pending.set(`${name}:${pending.size}`, () => resolve(key)));
  }),
  deleteMedia: vi.fn(async () => {}),
}));

import { uploadMedia } from "@/AdminModule/media/storage";
import MediaStep from "../steps/MediaStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });
const jpg = (name) => new File(["x"], name, { type: "image/jpeg" });
const finishAll = async () => {
  const resolvers = [...pending.values()];
  pending.clear();
  await act(async () => resolvers.forEach((resolve) => resolve()));
};
const finishInReverse = async () => {
  const resolvers = [...pending.values()].reverse();
  pending.clear();
  for (const resolve of resolvers) await act(async () => resolve());
};

describe("cover photo", () => {
  it("uploads into this invitation's folder and stores the key", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), jpg("cover.jpg"));
    expect(screen.getByRole("progressbar", { name: "cover.jpg" })).toBeInTheDocument();
    await finishAll();
    expect(latest().media.coverKey).toMatch(/^invitations\/inv-test\/[A-Za-z0-9]+\.jpg$/);
  });

  it("refuses an unsupported file without uploading", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), new File(["x"], "a.gif", { type: "image/gif" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG, PNG, WebP or iPhone photo.");
    expect(pending.size).toBe(0);
    expect(latest().media?.coverKey).toBeUndefined();
  });

  it("removes the cover after confirming", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { latest } = renderStep(MediaStep, { ...base(), media: { coverKey: "invitations/inv-test/c.jpg" } });
    await userEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    expect(confirm).toHaveBeenCalledWith("Remove this photo? This can't be undone.");
    expect(latest().media.coverKey).toBeUndefined();
    confirm.mockRestore();
  });

  it("keeps the cover when the removal isn't confirmed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { latest } = renderStep(MediaStep, { ...base(), media: { coverKey: "invitations/inv-test/c.jpg" } });
    await userEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    expect(latest().media.coverKey).toBe("invitations/inv-test/c.jpg");
    confirm.mockRestore();
  });

  it("keeps the newest upload when an older one finishes last", async () => {
    uploadMedia.mockClear();
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), jpg("a.jpg"));
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), jpg("b.jpg"));
    await act(async () => {});
    const [keyA, keyB] = uploadMedia.mock.calls.map(([args]) => args.key);
    await finishInReverse(); // B finishes first, A last
    expect(latest().media.coverKey).toBe(keyB);
    expect(latest().media.coverKey).not.toBe(keyA);
  });

  it("ignores an upload that finishes after Remove was pressed", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { latest } = renderStep(MediaStep, { ...base(), media: { coverKey: "invitations/inv-test/old.jpg" } });
    await userEvent.upload(screen.getByLabelText("Choose cover photo"), jpg("new.jpg"));
    await act(async () => {});
    await userEvent.click(screen.getByRole("button", { name: "Remove cover photo" }));
    await finishAll();
    expect(latest().media.coverKey).toBeUndefined();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    confirm.mockRestore();
  });
});

describe("gallery", () => {
  it("keeps every photo when uploads finish in a different order", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("one.jpg"), jpg("two.jpg"), jpg("three.jpg")]);
    await finishInReverse();
    expect(latest().media.gallery).toHaveLength(3);
    expect(new Set(latest().media.gallery.map((g) => g.key)).size).toBe(3);
  });

  it("stops at 12 photos and says how many were left out", async () => {
    const gallery = Array.from({ length: 11 }, (_, i) => ({ key: `invitations/inv-test/${i}.jpg` }));
    const { latest } = renderStep(MediaStep, { ...base(), media: { gallery } });
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("a.jpg"), jpg("b.jpg"), jpg("c.jpg")]);
    expect(screen.getByRole("alert")).toHaveTextContent("The gallery holds up to 12 photos — 2 not added.");
    await finishAll();
    expect(latest().media.gallery).toHaveLength(12);
    expect(screen.getByText("12 of 12 — the gallery is full")).toBeInTheDocument();
    expect(screen.getByLabelText("Add gallery photos")).toBeDisabled();
  });

  it("reserves room for failed uploads so a retry can never push past 12", async () => {
    const gallery = Array.from({ length: 10 }, (_, i) => ({ key: `invitations/inv-test/${i}.jpg` }));
    const { latest } = renderStep(MediaStep, { ...base(), media: { gallery } });
    uploadMedia.mockImplementationOnce(() => Promise.reject(new Error("net"))).mockImplementationOnce(() => Promise.reject(new Error("net")));
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("f1.jpg"), jpg("f2.jpg")]);
    await act(async () => {});
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2);
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("g1.jpg"), jpg("g2.jpg")]);
    expect(screen.getByText("The gallery holds up to 12 photos — 2 not added.")).toBeInTheDocument();
    await finishAll();
    expect(latest().media.gallery).toHaveLength(10);
  });

  it("keeps Retry for a failed photo while there is room, and the gallery stays within 12", async () => {
    const gallery = Array.from({ length: 10 }, (_, i) => ({ key: `invitations/inv-test/${i}.jpg` }));
    const { latest } = renderStep(MediaStep, { ...base(), media: { gallery } });
    uploadMedia.mockImplementationOnce(() => Promise.reject(new Error("net")));
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("f1.jpg")]);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), [jpg("g1.jpg")]);
    await finishAll();
    expect(latest().media.gallery).toHaveLength(11);
  });

  it("shows the over-12 draft error", () => {
    const gallery = Array.from({ length: 13 }, (_, i) => ({ key: `invitations/inv-test/${i}.jpg` }));
    renderStep(MediaStep, { ...base(), media: { gallery } });
    expect(screen.getByText("The gallery holds up to 12 photos")).toBeInTheDocument();
  });

  it("captions, reorders and removes photos", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const gallery = [{ key: "invitations/inv-test/a.jpg" }, { key: "invitations/inv-test/b.jpg" }];
    const { latest } = renderStep(MediaStep, { ...base(), media: { gallery } });
    await userEvent.type(screen.getByLabelText("Caption for photo 1"), "First look");
    expect(latest().media.gallery[0].caption).toEqual({ en: "First look" });
    await userEvent.click(screen.getByRole("button", { name: "Move photo 2 left" }));
    expect(latest().media.gallery.map((g) => g.key)).toEqual(["invitations/inv-test/b.jpg", "invitations/inv-test/a.jpg"]);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(latest().media.gallery.map((g) => g.key)).toEqual(["invitations/inv-test/a.jpg"]);
  });
});

describe("music", () => {
  const tracks = [{ id: "t1", name: "Shehnai", key: "music-library/t1.mp3", durationSec: 120 }];

  it("picks a song from the Music Library", async () => {
    const { latest } = renderStep(MediaStep, base(), { musicTracks: tracks });
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Song" }), "t1");
    expect(latest().media.music).toEqual({ type: "library", trackId: "t1", key: "music-library/t1.mp3" });
    await userEvent.click(screen.getByRole("radio", { name: "No music" }));
    expect(latest().media.music).toBeUndefined();
  });

  it("uploads a song for this invitation only", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.click(screen.getByRole("radio", { name: "Upload a song for this invitation" }));
    expect(screen.getByText("Only upload music you have the rights to use.")).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText("Choose a song"), new File(["x"], "song.mp3", { type: "audio/mpeg" }));
    await finishAll();
    expect(latest().media.music).toEqual({ type: "upload", key: expect.stringMatching(/^invitations\/inv-test\/[A-Za-z0-9]+\.mp3$/) });
  });

  it("refuses a song that isn't an MP3", async () => {
    renderStep(MediaStep, base());
    await userEvent.click(screen.getByRole("radio", { name: "Upload a song for this invitation" }));
    await userEvent.upload(screen.getByLabelText("Choose a song"), new File(["x"], "song.wav", { type: "audio/wav" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an MP3 under 10 MB.");
  });

  it("notes that the saved song keeps playing when another source is selected", async () => {
    renderStep(MediaStep, { ...base(), media: { music: { type: "upload", key: "invitations/inv-test/s.mp3" } } }, { musicTracks: tracks });
    expect(screen.queryByText(/keeps playing/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    expect(screen.getByText("Your current song keeps playing until you choose a new one.")).toBeInTheDocument();
  });

  it("ignores a song upload that finishes after No music was chosen", async () => {
    const { latest } = renderStep(MediaStep, base());
    await userEvent.click(screen.getByRole("radio", { name: "Upload a song for this invitation" }));
    await userEvent.upload(screen.getByLabelText("Choose a song"), new File(["x"], "song.mp3", { type: "audio/mpeg" }));
    await act(async () => {});
    await userEvent.click(screen.getByRole("radio", { name: "No music" }));
    await finishAll();
    expect(latest().media?.music).toBeUndefined();
  });

  it("ignores a song upload that finishes after a library song was picked", async () => {
    const { latest } = renderStep(MediaStep, base(), { musicTracks: tracks });
    await userEvent.click(screen.getByRole("radio", { name: "Upload a song for this invitation" }));
    await userEvent.upload(screen.getByLabelText("Choose a song"), new File(["x"], "song.mp3", { type: "audio/mpeg" }));
    await act(async () => {});
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Song" }), "t1");
    await finishAll();
    expect(latest().media.music).toEqual({ type: "library", trackId: "t1", key: "music-library/t1.mp3" });
  });

  it("says so when the Music Library couldn't be loaded", async () => {
    renderStep(MediaStep, base(), { musicTracks: [], musicTracksError: true });
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the Music Library — refresh the page to try again.");
    expect(screen.queryByText(/No songs in the Music Library yet/)).not.toBeInTheDocument();
  });

  it("explains when the library is empty", async () => {
    renderStep(MediaStep, base(), { musicTracks: [] });
    await userEvent.click(screen.getByRole("radio", { name: "From the Music Library" }));
    expect(screen.getByText(/No songs in the Music Library yet/)).toBeInTheDocument();
  });
});
