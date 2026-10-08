import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutosave } from "./useAutosave";

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

const setup = (save) =>
  renderHook(({ content }) => useAutosave({ content, initialVersion: 1, save }), { initialProps: { content: { n: 0 } } });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useAutosave", () => {
  it("does not save on load", () => {
    const save = vi.fn();
    setup(save);
    act(() => vi.advanceTimersByTime(10_000));
    expect(save).not.toHaveBeenCalled();
  });

  it("saves the latest content once, 3 seconds after typing stops", async () => {
    const save = vi.fn(async () => ({ ok: true, version: 2, savedAt: "2026-10-08T05:12:00.000Z" }));
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    act(() => vi.advanceTimersByTime(2000));
    rerender({ content: { n: 2 } });
    act(() => vi.advanceTimersByTime(2999));
    expect(save).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ content: { n: 2 }, expectedVersion: 1 });
    expect(result.current.state).toMatchObject({ status: "saved", version: 2 });
  });

  it("saves changes made during a save afterwards, with the new version", async () => {
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({ ok: true, version: 3, savedAt: "x" });
    const { rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    rerender({ content: { n: 2 } });
    await act(async () => first.resolve({ ok: true, version: 2, savedAt: "x" }));
    await act(async () => vi.advanceTimersByTime(3000));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ content: { n: 2 }, expectedVersion: 2 });
  });

  it("keeps the error and saves again on retry", async () => {
    const save = vi.fn().mockResolvedValueOnce({ ok: false, message: "Couldn't save." }).mockResolvedValueOnce({ ok: true, version: 2, savedAt: "x" });
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(result.current.state).toMatchObject({ status: "error", error: "Couldn't save." });
    await act(async () => result.current.retry());
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.state).toMatchObject({ status: "saved", error: null });
  });

  it("treats a thrown error as a failed save", async () => {
    const save = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(result.current.state.status).toBe("error");
  });

  it("explains a missing answer as a possible sign-out", async () => {
    const save = vi.fn().mockResolvedValueOnce(undefined);
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(result.current.state).toMatchObject({ status: "error", error: "You may have been signed out. Sign in again in a new tab, then click Retry." });
  });

  it("flushNow saves immediately and resolves when done, or joins a save in progress", async () => {
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise);
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    let a;
    let b;
    act(() => {
      a = result.current.flushNow();
      b = result.current.flushNow();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    await act(async () => first.resolve({ ok: true, version: 2, savedAt: "x" }));
    await a;
    expect(result.current.state.status).toBe("saved");
  });

  it("stops saving after a conflict", async () => {
    const save = vi.fn().mockResolvedValueOnce({ ok: false, conflict: true });
    const { result, rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    rerender({ content: { n: 2 } });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("conflict");
  });
});

describe("useAutosave flush on leave", () => {
  const ok = () => vi.fn(async () => ({ ok: true, version: 2, savedAt: "2026-10-08T05:12:00.000Z" }));

  it("saves pending edits once when unmounted while dirty", async () => {
    const save = ok();
    const { rerender, unmount } = setup(save);
    rerender({ content: { n: 1 } });
    unmount();
    await act(async () => {});
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ content: { n: 1 }, expectedVersion: 1 });
  });

  it("does not save on unmount when everything is saved or after a conflict", async () => {
    const saved = ok();
    setup(saved).unmount();
    expect(saved).not.toHaveBeenCalled();

    const save = vi.fn().mockResolvedValueOnce({ ok: false, conflict: true });
    const { rerender, unmount } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => vi.advanceTimersByTime(3000));
    rerender({ content: { n: 2 } });
    unmount();
    await act(async () => {});
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not save on pagehide, because a reload would race the new page", async () => {
    const save = ok();
    const { rerender } = setup(save);
    rerender({ content: { n: 1 } });
    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("useAutosave independence from save identity", () => {
  it("does not save again when the save function is replaced mid-session", async () => {
    const calls = [];
    const make = () => vi.fn(async (args) => {
      calls.push(args);
      return { ok: true, version: calls.length + 1, savedAt: "2026-10-08T05:12:00.000Z" };
    });
    const first = make();
    const { rerender } = renderHook(({ content, save }) => useAutosave({ content, initialVersion: 1, save }), {
      initialProps: { content: { n: 0 }, save: first },
    });
    rerender({ content: { n: 1 }, save: first });
    await act(async () => vi.advanceTimersByTime(3000));
    expect(first).toHaveBeenCalledTimes(1);
    rerender({ content: { n: 2 }, save: first });
    const second = make();
    rerender({ content: { n: 2 }, save: second });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith({ content: { n: 2 }, expectedVersion: 2 });
    expect(first).toHaveBeenCalledTimes(1);
  });
});
