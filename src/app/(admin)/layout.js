import "../globals.css";
import ConfigureAmplify from "@/AdminModule/auth/ConfigureAmplify";

export const metadata = { title: "Baba Saab Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    // The admin is light-themed: keep native controls (date/time pickers, icons) light even in OS dark mode.
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="bg-stone-50 text-stone-900">
        <ConfigureAmplify />
        {children}
      </body>
    </html>
  );
}
