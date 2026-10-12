import { defineStorage } from "@aws-amplify/backend";

// Staff upload and remove files. Guests read single files by exact URL through the bucket policy in backend.ts.
export const storage = defineStorage({
  name: "invitationMedia",
  access: (allow) => ({
    "invitations/*": [allow.groups(["admin"]).to(["read", "write", "delete"])],
    "music-library/*": [allow.groups(["admin"]).to(["read", "write", "delete"])],
  }),
});
