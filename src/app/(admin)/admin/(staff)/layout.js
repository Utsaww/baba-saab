import AdminShell from "@/AdminModule/AdminShell";
import { requireStaff } from "@/AdminModule/auth/server";

export default async function StaffLayout({ children }) {
  const session = await requireStaff();
  return (
    <AdminShell email={session.email} isOwner={session.isOwner}>
      {children}
    </AdminShell>
  );
}
