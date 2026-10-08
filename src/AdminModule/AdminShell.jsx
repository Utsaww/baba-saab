import Link from "next/link";
import SignOutButton from "./auth/SignOutButton";

export function navFor({ isOwner }) {
  return [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/invitations", label: "Invitations" },
    { href: "/admin/templates", label: "Templates" },
    ...(isOwner ? [{ href: "/admin/staff", label: "Staff" }] : []),
    { href: "/admin/help", label: "Help" },
  ];
}

export default function AdminShell({ email, isOwner, children }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200 bg-white md:flex md:w-56 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="px-5 py-4 font-semibold">Baba Saab · Invitations</div>
        <nav className="flex flex-wrap gap-1 px-3 pb-3 md:flex-col" aria-label="Admin">
          {navFor({ isOwner }).map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-[44px] items-center rounded-md px-3 text-sm hover:bg-stone-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-3 py-3 md:mt-auto md:flex-col md:items-stretch">
          <p className="truncate px-3 text-xs text-stone-500" title={email}>{email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
