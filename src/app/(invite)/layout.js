import "../globals.css";

export const metadata = { robots: { index: false, follow: false } };

export default function InviteLayout({ children }) {
  return (
    // Invitation designs are light: keep native controls (RSVP form fields) light even in OS dark mode.
    <html lang="en" style={{ colorScheme: "light" }}>
      <body>{children}</body>
    </html>
  );
}
