import { defineBackend } from "@aws-amplify/backend";
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { staffAdmin } from "./functions/staff-admin/resource";
import { storage } from "./storage/resource";

const backend = defineBackend({ auth, data, staffAdmin, storage });

// Staff accounts are created only by the owner (admin:create, /admin/staff); nobody can sign themselves up.
backend.auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
  "AdminCreateUserConfig.AllowAdminCreateUserOnly",
  true,
);

backend.staffAdmin.addEnvironment("STAFF_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);

// Guests' phones load invitation photos and music by exact URL. Only GetObject on these two folders is public:
// nothing can be listed, and the rest of the bucket stays private.
const { bucket, cfnResources } = backend.storage.resources;
cfnResources.cfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
};
bucket.addToResourcePolicy(
  new PolicyStatement({
    sid: "PublicReadInvitationMedia",
    effect: Effect.ALLOW,
    principals: [new AnyPrincipal()],
    actions: ["s3:GetObject"],
    resources: [bucket.arnForObjects("invitations/*"), bucket.arnForObjects("music-library/*")],
  }),
);
