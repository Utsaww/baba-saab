import Link from "next/link";

const NAV = [
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/help", label: "Help" },
];

export default function AdminShell({ children }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200 bg-white md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 py-4 font-semibold">Baba Saab · Invitations</div>
        <nav className="flex flex-wrap gap-1 px-3 pb-3 md:flex-col" aria-label="Admin">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm hover:bg-stone-100">
              {item.label}
            </Link>
          ))}
          <span className="rounded-md px-3 py-2 text-sm text-stone-400">Invitations · coming soon</span>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
