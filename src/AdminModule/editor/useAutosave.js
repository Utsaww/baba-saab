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
  // The server action gets a new identity after every revalidation, so only ever call the latest one.
  const saveRef = useRef(save);
  saveRef.current = save;
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
      result = await saveRef.current({ content: latest.current.content, expectedVersion: latest.current.version });
    } catch {
      result = { ok: false, message: FAILED };
    }
    inFlight.current = false;
    if (result?.ok) dispatch({ type: "success", version: result.version, savedAt: result.savedAt });
    else if (result?.conflict) dispatch({ type: "conflict" });
    else dispatch({ type: "failure", message: result?.message ?? FAILED });
  }, []);

  useEffect(() => {
    if (state.status !== "dirty") return undefined;
    const timer = setTimeout(runSave, delay);
    return () => clearTimeout(timer);
  }, [state.status, content, delay, runSave]);

  // Back/Forward and tab closes unmount or hide the page without any save, so send what is pending.
  useEffect(() => {
    const pending = () => ["dirty", "error"].includes(statusRef.current) && !inFlight.current;
    // The page may be restored from the back/forward cache, so keep local state in step with the save.
    const onPageHide = () => {
      if (pending()) runSave();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      // True unmount: nothing left to update, so fire and forget.
      if (!pending()) return;
      inFlight.current = true;
      Promise.resolve()
        .then(() => saveRef.current({ content: latest.current.content, expectedVersion: latest.current.version }))
        .catch(() => {})
        .finally(() => {
          inFlight.current = false;
        });
    };
  }, [runSave]);

  const retry = useCallback(() => {
    if (state.status === "error" || state.status === "dirty") return runSave();
    return undefined;
  }, [state.status, runSave]);

  return { state, retry };
}
