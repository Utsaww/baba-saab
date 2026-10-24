export const QR_OPTIONS = { width: 1024, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } };

// The admin and the public pages share a host, so links built here work on production and preview branches alike.
export const liveUrl = (origin, slug) => `${origin}/invitation/${slug}`;
export const previewUrl = (origin, slug, token) => `${liveUrl(origin, slug)}?preview=${encodeURIComponent(token)}`;
export const qrFileName = (slug) => `${slug}-qr.png`;
// The family's private, read-only list of replies (Task 6 serves it).
export const familyUrl = (origin, slug, token) => `${origin}/rsvps/${slug}?k=${encodeURIComponent(token)}`;
export const familyMessage = (url) =>
  `Here is your private link to see who has replied to your invitation. It shows guests' phone numbers, so please share it only within the family:\n${url}`;

export const previewMessage = (url) => `Here is the preview of your invitation. Please check every detail and let us know if anything needs changing:\n${url}`;
export const liveMessage = (url) => `Your invitation is live! Share this link with your guests:\n${url}`;

export async function downloadQr({ url, slug, toDataURL }) {
  // qrcode is CommonJS; depending on the bundler its functions arrive as named exports or under default.
  const encode = toDataURL ?? (await import("qrcode").then((m) => m.toDataURL ?? m.default.toDataURL));
  const dataUrl = await encode(url, QR_OPTIONS);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = qrFileName(slug);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
