// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const fs = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ ...fs, default: fs }));

import { ogFonts } from "./fonts";

beforeEach(() => fs.readFile.mockReset());

describe("ogFonts", () => {
  it("tries again after a failed read instead of keeping the failure", async () => {
    fs.readFile.mockRejectedValueOnce(new Error("EMFILE")).mockResolvedValue(Buffer.from("font"));
    await expect(ogFonts()).rejects.toThrow("EMFILE");
    const fonts = await ogFonts();
    expect(fonts.map((f) => f.name)).toEqual(["Display", "Devanagari"]);
  });
  it("reads the files once and reuses them", async () => {
    const first = await ogFonts();
    expect(await ogFonts()).toBe(first);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
