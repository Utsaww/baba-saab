import { fitWithin, isHeic, PHOTO_QUALITY } from "./files";

export const HEIC_FAILED = "Couldn't read that iPhone photo — export it as JPG and try again.";
export const PHOTO_FAILED = "Couldn't read that photo — try another one.";

export class PhotoError extends Error {
  friendly = true;
}

// The converter is large, so it only loads when someone actually picks an iPhone photo.
async function convertHeicInBrowser(file) {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(result) ? result[0] : result;
}

// "from-image" applies the photo's EXIF rotation, so portrait phone photos stay upright.
// Older browsers throw a TypeError for the options, so they get a plain decode instead.
export async function decodeInBrowser(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch (err) {
    if (err instanceof TypeError) return createImageBitmap(blob);
    throw err;
  }
}

export function encodeInBrowser(bitmap, { width, height }, quality, createCanvas = () => document.createElement("canvas")) {
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // JPEG has no transparency, so transparent PNG/WebP areas would turn black without a white backdrop.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/jpeg", quality);
  });
}

/** A JPEG no larger than 2000 px on its longest side, ready to upload. */
export async function preparePhoto(file, { convertHeic = convertHeicInBrowser, decode = decodeInBrowser, encode = encodeInBrowser } = {}) {
  let bitmap;
  if (isHeic(file)) {
    // Safari and iOS 17+ read iPhone photos natively; only convert when the browser can't.
    try {
      bitmap = await decode(file);
    } catch {
      let converted;
      try {
        converted = await convertHeic(file);
        bitmap = await decode(converted);
      } catch {
        throw new PhotoError(HEIC_FAILED);
      }
    }
  } else {
    try {
      bitmap = await decode(file);
    } catch {
      throw new PhotoError(PHOTO_FAILED);
    }
  }
  try {
    return await encode(bitmap, fitWithin(bitmap.width, bitmap.height), PHOTO_QUALITY);
  } catch {
    throw new PhotoError(PHOTO_FAILED);
  } finally {
    bitmap.close?.();
  }
}
