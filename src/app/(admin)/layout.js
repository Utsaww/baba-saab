import "../globals.css";
import AdminShell from "@/AdminModule/AdminShell";

export const metadata = { title: "Baba Saab Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
