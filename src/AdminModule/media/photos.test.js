import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeInBrowser, encodeInBrowser, HEIC_FAILED, PHOTO_FAILED, PhotoError, preparePhoto } from "./photos";

const bitmap = (width, height) => ({ width, height, close: vi.fn() });

describe("preparePhoto", () => {
  it("resizes to fit 2000 px and re-encodes as JPEG at 0.82", async () => {
    const decoded = bitmap(4032, 3024);
    const decode = vi.fn(async () => decoded);
    const encode = vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" }));
    const out = await preparePhoto({ name: "a.jpg", type: "image/jpeg", size: 5 }, { decode, encode, convertHeic: vi.fn() });
    expect(encode).toHaveBeenCalledWith(decoded, { width: 2000, height: 1500 }, 0.82);
    expect(out.type).toBe("image/jpeg");
    expect(decoded.close).toHaveBeenCalled();
  });

  it("decodes iPhone photos natively when the browser can, without converting", async () => {
    const convertHeic = vi.fn();
    const file = { name: "IMG_1.HEIC", type: "", size: 5 };
    const decode = vi.fn(async () => bitmap(100, 100));
    await preparePhoto(file, { convertHeic, decode, encode: async () => new Blob([]) });
    expect(decode).toHaveBeenCalledWith(file);
    expect(convertHeic).not.toHaveBeenCalled();
  });

  it("converts iPhone photos to JPEG when native decoding fails", async () => {
    const converted = new Blob(["converted"], { type: "image/jpeg" });
    const convertHeic = vi.fn(async () => converted);
    const file = { name: "IMG_1.HEIC", type: "", size: 5 };
    const decode = vi.fn(async (blob) => {
      if (blob === file) throw new Error("unsupported");
      return bitmap(100, 100);
    });
    await preparePhoto(file, { convertHeic, decode, encode: async () => new Blob([]) });
    expect(convertHeic).toHaveBeenCalledWith(file);
    expect(decode).toHaveBeenLastCalledWith(converted);
  });

  it("explains a failed iPhone conversion", async () => {
    const convertHeic = vi.fn(async () => {
      throw new Error("libheif");
    });
    const decode = vi.fn(async () => {
      throw new Error("unsupported");
    });
    await expect(preparePhoto({ name: "x.heic", type: "image/heic", size: 5 }, { convertHeic, decode })).rejects.toMatchObject({
      message: HEIC_FAILED,
      friendly: true,
    });
  });

  it("explains a photo the browser can't read", async () => {
    const decode = vi.fn(async () => {
      throw new Error("decode");
    });
    const error = await preparePhoto({ name: "x.png", type: "image/png", size: 5 }, { decode }).catch((e) => e);
    expect(error).toBeInstanceOf(PhotoError);
    expect(error.message).toBe(PHOTO_FAILED);
  });
});

describe("encodeInBrowser", () => {
  it("paints a white background before the photo, then encodes JPEG at 0.82", async () => {
    const calls = [];
    const ctx = {
      set fillStyle(v) {
        calls.push(["fillStyle", v]);
      },
      fillRect: vi.fn((...a) => calls.push(["fillRect", ...a])),
      drawImage: vi.fn((...a) => calls.push(["drawImage", ...a])),
    };
    const blob = new Blob(["x"], { type: "image/jpeg" });
    const canvas = { getContext: () => ctx, toBlob: vi.fn((cb) => cb(blob)) };
    const image = bitmap(10, 5);
    await expect(encodeInBrowser(image, { width: 8, height: 4 }, 0.82, () => canvas)).resolves.toBe(blob);
    expect(calls).toEqual([
      ["fillStyle", "#ffffff"],
      ["fillRect", 0, 0, 8, 4],
      ["drawImage", image, 0, 0, 8, 4],
    ]);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.82);
  });
});

describe("decodeInBrowser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks for EXIF rotation first", async () => {
    const result = { width: 1, height: 1 };
    const stub = vi.fn(async () => result);
    vi.stubGlobal("createImageBitmap", stub);
    const blob = new Blob(["x"]);
    await expect(decodeInBrowser(blob)).resolves.toBe(result);
    expect(stub).toHaveBeenCalledWith(blob, { imageOrientation: "from-image" });
  });

  it("retries without options when an older browser throws a TypeError", async () => {
    const result = { width: 1, height: 1 };
    const stub = vi.fn(async (_blob, options) => {
      if (options) throw new TypeError("bad options");
      return result;
    });
    vi.stubGlobal("createImageBitmap", stub);
    const blob = new Blob(["x"]);
    await expect(decodeInBrowser(blob)).resolves.toBe(result);
    expect(stub).toHaveBeenCalledTimes(2);
    expect(stub).toHaveBeenLastCalledWith(blob);
  });

  it("does not retry other failures", async () => {
    const stub = vi.fn(async () => {
      throw new Error("corrupt");
    });
    vi.stubGlobal("createImageBitmap", stub);
    await expect(decodeInBrowser(new Blob(["x"]))).rejects.toThrow("corrupt");
    expect(stub).toHaveBeenCalledTimes(1);
  });
});
