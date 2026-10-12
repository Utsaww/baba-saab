import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/storage", () => ({
  uploadData: vi.fn(({ options }) => {
    options.onProgress?.({ transferredBytes: 50, totalBytes: 100 });
    return { result: Promise.resolve({ path: "x" }) };
  }),
  remove: vi.fn(async ({ path }) => {
    if (path.includes("fail")) throw new Error("denied");
    return { path };
  }),
}));

import { remove, uploadData } from "aws-amplify/storage";
import { deleteMedia, uploadMedia } from "./storage";

afterEach(() => vi.restoreAllMocks());

describe("uploadMedia", () => {
  it("uploads to the key with its content type and reports progress as a fraction", async () => {
    const onProgress = vi.fn();
    const blob = new Blob(["x"]);
    await expect(uploadMedia({ key: "invitations/i/a.jpg", blob, contentType: "image/jpeg", onProgress })).resolves.toBe("invitations/i/a.jpg");
    expect(uploadData).toHaveBeenCalledWith(expect.objectContaining({ path: "invitations/i/a.jpg", data: blob, options: expect.objectContaining({ contentType: "image/jpeg" }) }));
    expect(onProgress).toHaveBeenCalledWith(0.5);
  });
});

describe("deleteMedia", () => {
  it("deletes every key and only logs failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(deleteMedia(["invitations/i/a.jpg", "invitations/i/fail.jpg"])).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
