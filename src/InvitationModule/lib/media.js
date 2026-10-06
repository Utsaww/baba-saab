const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

// Media fields store storage keys; full URLs (sample data) pass through unchanged.
export function mediaUrl(key) {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/${key.replace(/^\//, "")}`;
}

export function youtubeId(url) {
  const m = YOUTUBE_RE.exec(url ?? "");
  return m ? m[1] : null;
}

// Library tracks and one-off uploads both store their file key on the invitation, so no lookup is needed.
export function musicSrc(music) {
  return mediaUrl(music?.key);
}
