import { requireOwner } from "@/AdminModule/auth/server";
import { cookieDataClient } from "@/AdminModule/dataClient";
import { inviteStaffAction, removeStaffAction } from "@/AdminModule/staff/actions";
import { errorMessage } from "@/AdminModule/staff/format";
import InviteStaffForm from "@/AdminModule/staff/InviteStaffForm";
import StaffList from "@/AdminModule/staff/StaffList";

export const metadata = { title: "Staff · Baba Saab Admin" };

export default async function StaffPage() {
  const session = await requireOwner();
  const { data, errors } = await cookieDataClient().queries.listStaff();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Staff</h1>
      <p className="mt-1 text-stone-600">People who can sign in to this admin area. Only you, the owner, can see this page.</p>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Invite a staff member</h2>
        <p className="mt-1 text-sm text-stone-600">They&apos;ll get an email with a link and a temporary password.</p>
        <InviteStaffForm inviteAction={inviteStaffAction} />
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Current staff</h2>
        {errors?.length ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Couldn&apos;t load the staff list. {errorMessage(errors)} Refresh the page to try again.
          </p>
        ) : (
          <StaffList
            members={(data ?? []).filter(Boolean)}
            currentUsername={session.username}
            inviteAction={inviteStaffAction}
            removeAction={removeStaffAction}
          />
        )}
      </section>
    </div>
  );
}
