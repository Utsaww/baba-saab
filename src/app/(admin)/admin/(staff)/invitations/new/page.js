import Link from "next/link";
import { requireStaff } from "@/AdminModule/auth/server";
import { createInvitationAction } from "@/AdminModule/invitations/actions";
import NewInvitationForm from "@/AdminModule/invitations/NewInvitationForm";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";

export const metadata = { title: "New invitation · Baba Saab Admin" };

export default async function NewInvitationPage() {
  await requireStaff();
  const templates = templateChoices();

  return (
    <div className="max-w-5xl">
      <Link href="/admin/invitations" className="inline-flex min-h-[44px] items-center text-sm text-stone-600 hover:underline">
        ← All invitations
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New invitation</h1>
      <p className="text-stone-600">Choose a design, colours and language. You&apos;ll fill in the couple&apos;s details next.</p>
      <NewInvitationForm templates={templates} createAction={createInvitationAction} />
    </div>
  );
}
