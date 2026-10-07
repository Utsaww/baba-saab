import Link from "next/link";
import GuideBanner from "@/AdminModule/GuideBanner";
import { requireStaff } from "@/AdminModule/auth/server";

export const metadata = { title: "Dashboard · Baba Saab Admin" };

export default async function Dashboard() {
  const session = await requireStaff();
  const cards = [
    { href: "/admin/templates", title: "Templates", text: "Browse the 4 designs and show them to customers." },
    ...(session.isOwner ? [{ href: "/admin/staff", title: "Staff", text: "Invite or remove people who can sign in here." }] : []),
    { href: "/admin/help", title: "Help", text: "The staff guide: how everything here works." },
  ];

  return (
    <div className="max-w-4xl">
      <GuideBanner storageKey={`guide-banner-dismissed:${session.username}`} />
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="mt-1 text-stone-600">Signed in as {session.email}.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400">
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{card.text}</p>
          </Link>
        ))}
      </div>
      <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
        Coming soon: your invitations, upcoming events, recent RSVPs and invitations due for deletion will appear here.
      </p>
    </div>
  );
}
