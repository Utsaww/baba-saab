import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { staffAdmin } from "./functions/staff-admin/resource";

const backend = defineBackend({ auth, data, staffAdmin });

// Staff accounts are created only by the owner (admin:create, /admin/staff); nobody can sign themselves up.
backend.auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
  "AdminCreateUserConfig.AllowAdminCreateUserOnly",
  true,
);

backend.staffAdmin.addEnvironment("STAFF_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);
