import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { UPLOAD_FAILED, useUploads } from "./useUploads";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useUploads", () => {
  it("tracks progress, marks busy, and hands the result over when done", async () => {
    const d = deferred();
    let report;
    const onDone = vi.fn();
    const { result } = renderHook(() => useUploads());
    act(() => {
      result.current.start({ label: "a.jpg", run: (onProgress) => ((report = onProgress), d.promise), onDone });
    });
    expect(result.current.busy).toBe(true);
    act(() => report(0.4));
    expect(result.current.items[0]).toMatchObject({ label: "a.jpg", status: "uploading", progress: 0.4 });
    await act(async () => d.resolve("invitations/i/a.jpg"));
    expect(onDone).toHaveBeenCalledWith("invitations/i/a.jpg");
    expect(result.current.items).toEqual([]);
    expect(result.current.busy).toBe(false);
  });

  it("keeps a failed upload for retry, with a friendly message", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce("k");
    const onDone = vi.fn();
    const { result } = renderHook(() => useUploads());
    await act(async () => {
      result.current.start({ label: "a.jpg", run, onDone });
    });
    expect(result.current.items[0]).toMatchObject({ status: "failed", error: UPLOAD_FAILED });
    expect(result.current.busy).toBe(false);
    await act(async () => result.current.retry(result.current.items[0].id));
    expect(onDone).toHaveBeenCalledWith("k");
    expect(result.current.items).toEqual([]);
  });

  it("shows the photo's own explanation when it has one", async () => {
    const run = vi.fn().mockRejectedValue(Object.assign(new Error("Couldn't read that iPhone photo — export it as JPG and try again."), { friendly: true }));
    const { result } = renderHook(() => useUploads());
    await act(async () => {
      result.current.start({ label: "x.heic", run, onDone: vi.fn() });
    });
    expect(result.current.items[0].error).toMatch(/iPhone photo/);
  });

  it("can dismiss a failed upload", async () => {
    const { result } = renderHook(() => useUploads());
    await act(async () => {
      result.current.start({ label: "a.jpg", run: () => Promise.reject(new Error("x")), onDone: vi.fn() });
    });
    act(() => result.current.dismiss(result.current.items[0].id));
    expect(result.current.items).toEqual([]);
  });

  it("ignores a result that arrives after the item was dismissed", async () => {
    const d = deferred();
    const onDone = vi.fn();
    const { result } = renderHook(() => useUploads());
    act(() => {
      result.current.start({ label: "a.jpg", run: () => d.promise, onDone });
    });
    act(() => result.current.dismiss(result.current.items[0].id));
    await act(async () => d.resolve("k"));
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
  });

  it("does not re-run an upload that is still uploading", async () => {
    const d = deferred();
    const run = vi.fn(() => d.promise);
    const { result } = renderHook(() => useUploads());
    act(() => {
      result.current.start({ label: "a.jpg", run, onDone: vi.fn() });
    });
    act(() => {
      result.current.retry(result.current.items[0].id);
    });
    expect(run).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve("k"));
  });
});
