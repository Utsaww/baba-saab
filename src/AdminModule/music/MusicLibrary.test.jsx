import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/AdminModule/media/storage", () => ({ uploadMedia: vi.fn(async ({ key }) => key), deleteMedia: vi.fn(async () => {}) }));
vi.mock("@/AdminModule/media/audio", () => ({ readDuration: vi.fn(async () => 95) }));

import { deleteMedia, uploadMedia } from "@/AdminModule/media/storage";
import MusicLibrary from "./MusicLibrary";

const tracks = [
  { id: "t1", name: "Shehnai", key: "music-library/t1.mp3", durationSec: 195, createdBy: "neha@example.com", createdAt: "2026-10-01T10:00:00.000Z" },
  { id: "t2", name: "Dhol Beat", key: "music-library/t2.mp3", durationSec: 61, createdBy: "amit@example.com", createdAt: "2026-10-02T10:00:00.000Z" },
];
const usage = { t1: ["Priya & Rahul", "Neha & Arjun"] };

function setup(overrides = {}) {
  const props = {
    tracks,
    usage,
    createAction: vi.fn(async ({ name }) => ({ ok: true, track: { id: "t3", name } })),
    renameAction: vi.fn(async () => ({ ok: true })),
    deleteAction: vi.fn(async () => ({ ok: true, key: "music-library/t2.mp3" })),
    ...overrides,
  };
  render(<MusicLibrary {...props} />);
  return props;
}

const row = (name) => screen.getByText(name).closest("li");

afterEach(() => vi.clearAllMocks());

describe("MusicLibrary", () => {
  it("lists songs with their length, who added them and which invitations use them", () => {
    setup();
    expect(within(row("Shehnai")).getByText(/3:15/)).toBeInTheDocument();
    expect(within(row("Shehnai")).getByText("Used by: Priya & Rahul, Neha & Arjun")).toBeInTheDocument();
    expect(within(row("Dhol Beat")).getByText("Not used yet")).toBeInTheDocument();
  });

  it("won't delete a song that invitations use", () => {
    setup();
    expect(within(row("Shehnai")).getByRole("button", { name: "Delete Shehnai" })).toBeDisabled();
    expect(within(row("Shehnai")).getByText("Used by 2 invitations — change their music first.")).toBeInTheDocument();
  });

  it("adds a song to the library folder with a name defaulted from the file", async () => {
    const { createAction } = setup();
    await userEvent.upload(screen.getByLabelText("Choose an MP3"), new File(["x"], "Wedding_Entry.mp3", { type: "audio/mpeg" }));
    expect(screen.getByLabelText("Song name")).toHaveValue("Wedding Entry");
    expect(screen.getByText("Only upload music you have the rights to use.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Upload song" }));
    const key = uploadMedia.mock.calls[0][0].key;
    expect(key).toMatch(/^music-library\/[A-Za-z0-9]+\.mp3$/);
    expect(createAction).toHaveBeenCalledWith({ name: "Wedding Entry", key, durationSec: 95 });
    expect(await screen.findByRole("status")).toHaveTextContent('Added "Wedding Entry".');
  });

  it("removes the uploaded file if the song can't be saved", async () => {
    setup({ createAction: vi.fn(async () => ({ ok: false, message: "Something went wrong. Please try again." })) });
    await userEvent.upload(screen.getByLabelText("Choose an MP3"), new File(["x"], "a.mp3", { type: "audio/mpeg" }));
    await userEvent.click(screen.getByRole("button", { name: "Upload song" }));
    expect(deleteMedia).toHaveBeenCalledWith([uploadMedia.mock.calls[0][0].key]);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("refuses files that aren't MP3", async () => {
    setup();
    await userEvent.upload(screen.getByLabelText("Choose an MP3"), new File(["x"], "a.wav", { type: "audio/wav" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an MP3 under 10 MB.");
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("renames a song", async () => {
    const { renameAction } = setup();
    await userEvent.click(within(row("Dhol Beat")).getByRole("button", { name: "Rename Dhol Beat" }));
    const input = screen.getByLabelText("New name for Dhol Beat");
    await userEvent.clear(input);
    await userEvent.type(input, "Dhol Entry");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(renameAction).toHaveBeenCalledWith({ id: "t2", name: "Dhol Entry" });
  });

  it("shows an error and re-enables Save when renaming throws", async () => {
    setup({ renameAction: vi.fn(async () => { throw new Error("boom"); }) });
    await userEvent.click(within(row("Dhol Beat")).getByRole("button", { name: "Rename Dhol Beat" }));
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the name.");
    expect(screen.getByRole("button", { name: "Save name" })).toBeEnabled();
  });

  it("deletes an unused song and then its file", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { deleteAction } = setup();
    await userEvent.click(within(row("Dhol Beat")).getByRole("button", { name: "Delete Dhol Beat" }));
    expect(deleteAction).toHaveBeenCalledWith({ id: "t2" });
    expect(deleteMedia).toHaveBeenCalledWith(["music-library/t2.mp3"]);
  });

  it("invites staff to add the first song", () => {
    render(<MusicLibrary tracks={[]} usage={{}} createAction={vi.fn()} renameAction={vi.fn()} deleteAction={vi.fn()} />);
    expect(screen.getByText("No songs yet. Add the first one above.")).toBeInTheDocument();
  });
});
