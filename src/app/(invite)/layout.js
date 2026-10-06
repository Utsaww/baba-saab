import "../globals.css";

export const metadata = { robots: { index: false, follow: false } };

export default function InviteLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
