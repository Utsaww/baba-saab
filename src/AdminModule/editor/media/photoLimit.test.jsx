import { describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({ running: 0, peak: 0, started: 0, gates: [] }));
vi.mock("@/AdminModule/media/photos", () => ({
  preparePhoto: vi.fn(
    (file) =>
      new Promise((resolve) => {
        state.running += 1;
        state.started += 1;
        state.peak = Math.max(state.peak, state.running);
        state.gates.push(() => {
          state.running -= 1;
          resolve(new Blob([file.name], { type: "image/jpeg" }));
        });
      }),
  ),
}));
vi.mock("@/AdminModule/media/storage", () => ({
  uploadMedia: vi.fn(async ({ key }) => key),
  deleteMedia: vi.fn(async () => {}),
}));

import MediaStep from "../steps/MediaStep";
import { renderStep } from "../test-utils";

describe("gallery photo processing", () => {
  it("prepares at most 2 photos at a time and still adds all of them", async () => {
    const { latest } = renderStep(MediaStep, { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" });
    const files = ["a", "b", "c", "d"].map((n) => new File(["x"], `${n}.jpg`, { type: "image/jpeg" }));
    await userEvent.upload(screen.getByLabelText("Add gallery photos"), files);
    await act(async () => {});
    expect(state.started).toBe(2);
    expect(state.running).toBe(2);
    while (state.gates.length) {
      await act(async () => state.gates.shift()());
      await act(async () => {});
    }
    expect(state.started).toBe(4);
    expect(state.peak).toBe(2);
    expect(latest().media.gallery).toHaveLength(4);
  });
});
