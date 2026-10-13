import { describe, expect, it } from "vitest";
import { createLimiter } from "./limit";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createLimiter", () => {
  it("never runs more than N at once, and every task finishes", async () => {
    const run = createLimiter(2);
    let running = 0;
    let peak = 0;
    const gates = Array.from({ length: 5 }, deferred);
    const results = gates.map((gate, i) =>
      run(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await gate.promise;
        running -= 1;
        return i;
      }),
    );
    await tick();
    expect(running).toBe(2);
    for (const gate of gates) {
      gate.resolve();
      await tick();
    }
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it("frees the slot when a task rejects", async () => {
    const run = createLimiter(1);
    const failing = run(async () => {
      throw new Error("boom");
    });
    const after = run(async () => "ok");
    await expect(failing).rejects.toThrow("boom");
    await expect(after).resolves.toBe("ok");
  });

  it("frees the slot when a task throws synchronously", async () => {
    const run = createLimiter(1);
    const failing = run(() => {
      throw new Error("sync");
    });
    const after = run(async () => "ok");
    await expect(failing).rejects.toThrow("sync");
    await expect(after).resolves.toBe("ok");
  });
});
