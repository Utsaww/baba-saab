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
