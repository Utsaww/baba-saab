import { headers } from "next/headers";
import "../globals.css";

// metadataBase lets relative Open Graph image URLs resolve to absolute ones for the host serving the request.
export async function generateMetadata() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const robots = { index: false, follow: false };
  // A malformed or comma-separated forwarded host must not fail every invitation page; links just stay relative.
  try {
    return { metadataBase: new URL(`${proto}://${host}`), robots };
  } catch {
    return { robots };
  }
}

export default function InviteLayout({ children }) {
  return (
    // Invitation designs are light: keep native controls (RSVP form fields) light even in OS dark mode.
    <html lang="en" style={{ colorScheme: "light" }}>
      <body>{children}</body>
    </html>
  );
}
