"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/AdminModule/auth/server";
import { cookieDataClient } from "@/AdminModule/dataClient";
import { errorMessage } from "./format";

export async function inviteStaffAction({ email, name }) {
  await requireOwner();
  if (!email?.trim()) return { ok: false, message: "Enter the staff member's email address." };

  const { data, errors } = await cookieDataClient().mutations.inviteStaff({ email: email.trim(), name: name?.trim() || null });
  if (errors?.length || !data) return { ok: false, message: errorMessage(errors) };

  revalidatePath("/admin/staff");
  return {
    ok: true,
    message: `Invitation emailed to ${data.email}. It contains a temporary password that works for 7 days.`,
  };
}

export async function removeStaffAction({ username }) {
  await requireOwner();

  const { data, errors } = await cookieDataClient().mutations.removeStaff({ username });
  if (errors?.length || !data) return { ok: false, message: errorMessage(errors) };

  revalidatePath("/admin/staff");
  return { ok: true, message: "Removed. They can no longer sign in, and any open session ends within the hour." };
}
