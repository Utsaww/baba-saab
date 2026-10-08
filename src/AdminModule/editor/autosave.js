export const SAVE_DELAY_MS = 3000;

export function initialSaveState(version) {
  return { status: "saved", version, savedAt: null, error: null, queued: false };
}

/**
 * saved → (edit) dirty → (start) saving → (success) saved | (failure) error | (conflict) conflict.
 * Edits during a save set `queued`, so the next save picks them up. A failure's message stays
 * until a save succeeds. A conflict is final: nothing more is saved until the page reloads.
 */
export function saveReducer(state, action) {
  switch (action.type) {
    case "edit":
      if (state.status === "conflict") return state;
      if (state.status === "saving") return { ...state, queued: true };
      return { ...state, status: "dirty" };
    case "start":
      return { ...state, status: "saving", queued: false };
    case "success":
      return { ...state, status: state.queued ? "dirty" : "saved", version: action.version, savedAt: action.savedAt, error: null, queued: false };
    case "failure":
      return { ...state, status: "error", error: action.message, queued: false };
    case "conflict":
      return { ...state, status: "conflict", queued: false };
    default:
      return state;
  }
}

export const hasUnsavedChanges = (state) => state.status !== "saved";

const savedTime = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

export function statusLabel(state) {
  switch (state.status) {
    case "saving":
      return "Saving…";
    case "saved": {
      // An unparseable timestamp must never crash the editor; fall back to the plain label.
      const at = state.savedAt ? new Date(state.savedAt) : null;
      return at && !Number.isNaN(at.getTime()) ? `Saved ${savedTime.format(at)}` : "All changes saved";
    }
    case "conflict":
      return "Not saved";
    default:
      return "Unsaved changes";
  }
}
