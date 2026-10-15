"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialSaveState, SAVE_DELAY_MS, saveReducer } from "./autosave";

const FAILED = "Couldn't save. Check your connection and try again.";
const SIGNED_OUT = "You may have been signed out. Sign in again in a new tab, then click Retry.";

/** Saves `content` SAVE_DELAY_MS after the last change, one save at a time, always with the latest version. */
export function useAutosave({ content, initialVersion, save, onSaved, delay = SAVE_DELAY_MS }) {
  const [state, dispatch] = useReducer(saveReducer, initialVersion, initialSaveState);
  const latest = useRef({ content, version: initialVersion });
  latest.current.content = content;
  latest.current.version = state.version;
  const initialContent = useRef(content);
  // The content and version of the last successful save, and whether a save has hit a conflict.
  const lastGood = useRef({ content, version: initialVersion });
  const conflicted = useRef(false);
  // The promise of the save in progress, or null.
  const inFlight = useRef(null);
  const statusRef = useRef(state.status);
  // The server action gets a new identity after every revalidation, so only ever call the latest one.
  const saveRef = useRef(save);
  saveRef.current = save;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  statusRef.current = state.status;

  useEffect(() => {
    // Compared by identity so React's double-run of effects in development never marks a fresh page dirty.
    if (content !== initialContent.current) dispatch({ type: "edit" });
  }, [content]);

  const runSave = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    dispatch({ type: "start" });
    const run = (async () => {
      const sent = latest.current.content;
      let result;
      try {
        result = await saveRef.current({ content: sent, expectedVersion: latest.current.version });
        // No answer at all usually means the session ended and the request was redirected to sign-in.
        if (result === undefined) result = { ok: false, message: SIGNED_OUT };
      } catch {
        result = { ok: false, message: FAILED };
      }
      inFlight.current = null;
      if (result?.ok) {
        // Kept in refs straight away so a save started before the next render (see settle) uses the new version.
        latest.current.version = result.version;
        lastGood.current = { content: sent, version: result.version };
        dispatch({ type: "success", version: result.version, savedAt: result.savedAt });
        onSavedRef.current?.(sent);
      } else if (result?.conflict) {
        conflicted.current = true;
        dispatch({ type: "conflict" });
      }
      else dispatch({ type: "failure", message: result?.message ?? FAILED });
      return result;
    })();
    inFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    if (state.status !== "dirty") return undefined;
    const timer = setTimeout(runSave, delay);
    return () => clearTimeout(timer);
  }, [state.status, content, delay, runSave]);

  // In-app navigation unmounts the editor without any save, so send what is pending. (A page
  // reload is covered by the browser's own warning: the new page loads before the old one can save.)
  useEffect(
    () => () => {
      if (!["dirty", "error"].includes(statusRef.current) || inFlight.current) return;
      // True unmount: nothing left to update, so fire and forget.
      inFlight.current = Promise.resolve()
        .then(() => saveRef.current({ content: latest.current.content, expectedVersion: latest.current.version }))
        .catch(() => {})
        .finally(() => {
          inFlight.current = null;
        });
    },
    [],
  );

  const retry = useCallback(() => {
    if (state.status === "error" || state.status === "dirty") return runSave();
    return undefined;
  }, [state.status, runSave]);

  // Saves what is pending (or waits for the save in progress); resolves with the save result when it has finished.
  const flushNow = useCallback(() => runSave(), [runSave]);

  // Saves until nothing is pending — the save in progress, then any edits queued behind it — and resolves with
  // { ok: true, version, content } of the stored copy, or the first failed save's result. Saves nothing when all is saved.
  const settle = useCallback(async () => {
    if (inFlight.current) {
      const result = await inFlight.current;
      if (!result?.ok) return result;
    }
    while (latest.current.content !== lastGood.current.content) {
      if (conflicted.current) return { ok: false, conflict: true };
      const result = await runSave();
      if (!result?.ok) return result;
    }
    return { ok: true, version: lastGood.current.version, content: lastGood.current.content };
  }, [runSave]);

  return { state, retry, flushNow, settle };
}
