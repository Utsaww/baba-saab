import { defineAuth } from "@aws-amplify/backend";
import { staffAdmin } from "../functions/staff-admin/resource";

// Shown in the invitation email Cognito sends new staff. Deployed branches set ADMIN_SITE_URL
// in the Amplify console; the sandbox falls back to the local dev server.
const SITE_URL = (process.env.ADMIN_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const auth = defineAuth({
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: "Your Baba Saab Invitations staff account",
        emailBody: (user, code) =>
          [
            "Hello,",
            "You have been added as staff on Baba Saab Invitations.",
            `Sign in at ${SITE_URL}/admin/login`,
            `Email: ${user()}`,
            `Temporary password: ${code()}`,
            "You will choose your own password the first time you sign in. The temporary password works for 7 days.",
          ].join("<br><br>"),
      },
    },
  },
  groups: ["owner", "admin"],
  access: (allow) => [
    allow
      .resource(staffAdmin)
      .to(["createUser", "deleteUser", "getUser", "listUsersInGroup", "listGroupsForUser", "addUserToGroup"]),
  ],
});
