"use client";

import { useCallback, useRef, useState } from "react";
import { randomId } from "./files";

export const UPLOAD_FAILED = "Couldn't upload — check the connection and retry.";

/** A small upload queue: progress per item, failed items stay for Retry, `busy` while anything is uploading. */
export function useUploads() {
  const [items, setItems] = useState([]);
  const jobs = useRef(new Map());
  const running = useRef(new Set());

  const patch = useCallback((id, change) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const execute = useCallback(
    async (id) => {
      const job = jobs.current.get(id);
      if (!job || running.current.has(id)) return; // dismissed (or already running): nothing to do
      running.current.add(id);
      patch(id, { status: "uploading", progress: 0, error: null });
      try {
        const result = await job.run(
          (progress) => patch(id, { progress }),
          () => jobs.current.get(id) !== job, // true once dismissed, so a job can stop before uploading
        );
        if (!jobs.current.has(id)) return; // dismissed while uploading
        jobs.current.delete(id);
        setItems((list) => list.filter((item) => item.id !== id));
        job.onDone(result);
      } catch (err) {
        patch(id, { status: "failed", error: err?.friendly ? err.message : UPLOAD_FAILED });
      } finally {
        running.current.delete(id);
      }
    },
    [patch],
  );

  const dismiss = useCallback((id) => {
    jobs.current.delete(id);
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  /** `job.replaceGroup`: a single-value slot, so the newest job replaces every earlier one in its group (uploading or failed). */
  const start = useCallback(
    (job) => {
      if (job.replaceGroup && job.group) {
        for (const [otherId, other] of [...jobs.current]) if (other.group === job.group) dismiss(otherId);
      }
      const id = randomId();
      jobs.current.set(id, job);
      setItems((list) => [...list, { id, label: job.label, group: job.group ?? null, status: "uploading", progress: 0, error: null }]);
      execute(id);
      return id;
    },
    [execute, dismiss],
  );

  const retry = useCallback((id) => execute(id), [execute]);

  return { items, start, retry, dismiss, busy: items.some((item) => item.status === "uploading") };
}
