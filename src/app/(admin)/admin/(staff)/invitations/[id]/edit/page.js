import { notFound } from "next/navigation";
import { requireStaff } from "@/AdminModule/auth/server";
import { saveInvitationAction } from "@/AdminModule/invitations/actions";
import { getInvitation } from "@/AdminModule/invitations/data";
import { templateChoices } from "@/AdminModule/invitations/templateChoices";
import EditorShell from "@/AdminModule/editor/EditorShell";
import { stepNumber } from "@/AdminModule/editor/stepNumber";

export const metadata = { title: "Edit invitation · Baba Saab Admin" };

export default async function EditInvitationPage({ params, searchParams }) {
  await requireStaff();
  const invitation = await getInvitation(params.id);
  if (!invitation) notFound();
  return (
    <EditorShell
      invitation={invitation}
      initialStep={stepNumber(searchParams?.step)}
      templates={templateChoices()}
      saveAction={saveInvitationAction}
    />
  );
}
