import Link from "next/link";

export default function InvitationNotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">This invitation doesn&apos;t exist</h1>
      <p className="mt-2 text-stone-600">It may have been deleted, or the link may be wrong.</p>
      <Link href="/admin/invitations" className="mt-4 inline-flex min-h-[44px] items-center underline">
        Back to all invitations
      </Link>
    </div>
  );
}
