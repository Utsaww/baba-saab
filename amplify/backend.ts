import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

const backend = defineBackend({ auth });

// Staff accounts are created only by the owner (admin:create, /admin/staff); nobody can sign themselves up.
backend.auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
  "AdminCreateUserConfig.AllowAdminCreateUserOnly",
  true,
);
