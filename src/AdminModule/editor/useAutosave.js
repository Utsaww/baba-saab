"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialSaveState, SAVE_DELAY_MS, saveReducer } from "./autosave";

const FAILED = "Couldn't save. Check your connection and try again.";

/** Saves `content` SAVE_DELAY_MS after the last change, one save at a time, always with the latest version. */
export function useAutosave({ content, initialVersion, save, delay = SAVE_DELAY_MS }) {
  const [state, dispatch] = useReducer(saveReducer, initialVersion, initialSaveState);
  const latest = useRef({ content, version: initialVersion });
  latest.current.content = content;
  latest.current.version = state.version;
  const initialContent = useRef(content);
  const inFlight = useRef(false);

  useEffect(() => {
    // Compared by identity so React's double-run of effects in development never marks a fresh page dirty.
    if (content !== initialContent.current) dispatch({ type: "edit" });
  }, [content]);

  const runSave = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "start" });
    let result;
    try {
      result = await save({ content: latest.current.content, expectedVersion: latest.current.version });
    } catch {
      result = { ok: false, message: FAILED };
    }
    inFlight.current = false;
    if (result?.ok) dispatch({ type: "success", version: result.version, savedAt: result.savedAt });
    else if (result?.conflict) dispatch({ type: "conflict" });
    else dispatch({ type: "failure", message: result?.message ?? FAILED });
  }, [save]);

  useEffect(() => {
    if (state.status !== "dirty") return undefined;
    const timer = setTimeout(runSave, delay);
    return () => clearTimeout(timer);
  }, [state.status, content, delay, runSave]);

  const retry = useCallback(() => {
    if (state.status === "error" || state.status === "dirty") return runSave();
    return undefined;
  }, [state.status, runSave]);

  return { state, retry };
}
