import "../globals.css";
import AdminShell from "@/AdminModule/AdminShell";
import ConfigureAmplify from "@/AdminModule/auth/ConfigureAmplify";

export const metadata = { title: "Baba Saab Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <ConfigureAmplify />
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
