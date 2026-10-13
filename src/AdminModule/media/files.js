export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_MUSIC_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_SIDE = 2000;
export const PHOTO_QUALITY = 0.82;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
export const MUSIC_ACCEPT = "audio/mpeg,.mp3";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Windows often reports no type for .heic files, so the extension counts too.
export const isHeic = (file) => /^image\/hei[cf]$/.test(file?.type ?? "") || /\.hei[cf]$/i.test(file?.name ?? "");

export function validatePhoto(file) {
  if (!file?.size) return "That file is empty — choose another photo.";
  if (!PHOTO_TYPES.includes(file.type) && !isHeic(file)) return "Use a JPG, PNG, WebP or iPhone photo.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is over 25 MB.";
  return null;
}

export function validateMusic(file) {
  if (!file?.size) return "That file is empty — choose another song.";
  const mp3 = ["audio/mpeg", "audio/mp3"].includes(file.type) || /\.mp3$/i.test(file.name ?? "");
  if (!mp3 || file.size > MAX_MUSIC_BYTES) return "Choose an MP3 under 10 MB.";
  return null;
}

export function fitWithin(width, height, maxSide = PHOTO_MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const randomId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");

export const newKey = (folder, ext) => `${folder}${randomId()}.${ext}`;
