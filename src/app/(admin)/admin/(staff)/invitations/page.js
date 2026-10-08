import Link from "next/link";
import { requireStaff } from "@/AdminModule/auth/server";
import { listInvitations } from "@/AdminModule/invitations/data";
import InvitationList from "@/AdminModule/invitations/InvitationList";
import { TEMPLATES } from "@/InvitationModule/templates/registry";

export const metadata = { title: "Invitations · Baba Saab Admin" };

export default async function InvitationsPage() {
  await requireStaff();
  let rows = null;
  try {
    rows = await listInvitations();
  } catch (err) {
    console.error("listInvitations failed", err);
  }
  const templateNames = Object.fromEntries(TEMPLATES.map((t) => [t.id, t.name]));

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <Link href="/admin/invitations/new" className="inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white">
          New invitation
        </Link>
      </div>
      {rows ? (
        <InvitationList rows={rows} templateNames={templateNames} now={Date.now()} />
      ) : (
        <p role="alert" className="mt-6 text-sm text-red-700">
          Couldn&apos;t load invitations. Refresh the page to try again.
        </p>
      )}
    </div>
  );
}
