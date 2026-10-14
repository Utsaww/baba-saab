import { headers } from "next/headers";
import "../globals.css";

// metadataBase lets relative Open Graph image URLs resolve to absolute ones for the host serving the request.
export async function generateMetadata() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { metadataBase: new URL(`${proto}://${host}`), robots: { index: false, follow: false } };
}

export default function InviteLayout({ children }) {
  return (
    // Invitation designs are light: keep native controls (RSVP form fields) light even in OS dark mode.
    <html lang="en" style={{ colorScheme: "light" }}>
      <body>{children}</body>
    </html>
  );
}
