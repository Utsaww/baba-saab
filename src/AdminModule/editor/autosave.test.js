import { describe, expect, it } from "vitest";
import { hasUnsavedChanges, initialSaveState, saveReducer, statusLabel } from "./autosave";

const run = (actions, state = initialSaveState(1)) => actions.reduce(saveReducer, state);

describe("saveReducer", () => {
  it("starts saved", () => {
    expect(initialSaveState(4)).toEqual({ status: "saved", version: 4, savedAt: null, error: null, queued: false });
  });

  it("goes dirty → saving → saved with the new version", () => {
    const state = run([{ type: "edit" }, { type: "start" }, { type: "success", version: 2, savedAt: "2026-10-08T05:12:00.000Z" }]);
    expect(state).toMatchObject({ status: "saved", version: 2, savedAt: "2026-10-08T05:12:00.000Z" });
  });

  it("remembers edits made while a save is in flight, so they are saved next", () => {
    const state = run([{ type: "edit" }, { type: "start" }, { type: "edit" }, { type: "success", version: 2, savedAt: "x" }]);
    expect(state).toMatchObject({ status: "dirty", version: 2, queued: false });
  });

  it("keeps the error message until a save succeeds", () => {
    let state = run([{ type: "edit" }, { type: "start" }, { type: "failure", message: "Couldn't save." }]);
    expect(state).toMatchObject({ status: "error", error: "Couldn't save." });
    state = run([{ type: "edit" }], state);
    expect(state).toMatchObject({ status: "dirty", error: "Couldn't save." });
    state = run([{ type: "start" }, { type: "success", version: 2, savedAt: "x" }], state);
    expect(state.error).toBeNull();
  });

  it("stops at a conflict and ignores further edits", () => {
    const state = run([{ type: "edit" }, { type: "start" }, { type: "conflict" }, { type: "edit" }]);
    expect(state.status).toBe("conflict");
  });
});

describe("hasUnsavedChanges", () => {
  it("is false only when everything is saved", () => {
    expect(hasUnsavedChanges(initialSaveState(1))).toBe(false);
    expect(hasUnsavedChanges(run([{ type: "edit" }]))).toBe(true);
    expect(hasUnsavedChanges(run([{ type: "edit" }, { type: "start" }]))).toBe(true);
  });
});

describe("statusLabel", () => {
  it("describes each state in plain words", () => {
    expect(statusLabel(initialSaveState(1))).toBe("All changes saved");
    expect(statusLabel(run([{ type: "edit" }]))).toBe("Unsaved changes");
    expect(statusLabel(run([{ type: "edit" }, { type: "start" }]))).toBe("Saving…");
    expect(statusLabel(run([{ type: "edit" }, { type: "start" }, { type: "success", version: 2, savedAt: "2026-10-08T05:12:00.000Z" }]))).toBe("Saved 10:42");
    expect(statusLabel(run([{ type: "edit" }, { type: "start" }, { type: "conflict" }]))).toBe("Not saved");
  });
});
