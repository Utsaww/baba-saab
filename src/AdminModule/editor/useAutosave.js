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
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

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

  // Back/Forward and tab closes unmount or hide the page without any save, so send what is pending.
  useEffect(() => {
    const flush = () => {
      if (!["dirty", "error"].includes(statusRef.current) || inFlight.current) return;
      inFlight.current = true;
      Promise.resolve()
        .then(() => save({ content: latest.current.content, expectedVersion: latest.current.version }))
        .catch(() => {})
        .finally(() => {
          inFlight.current = false;
        });
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  const retry = useCallback(() => {
    if (state.status === "error" || state.status === "dirty") return runSave();
    return undefined;
  }, [state.status, runSave]);

  return { state, retry };
}
