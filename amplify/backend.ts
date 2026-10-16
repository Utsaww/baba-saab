import { defineBackend } from "@aws-amplify/backend";
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { invitationLifecycle } from "./functions/invitation-lifecycle/resource";
import { invitationPublic } from "./functions/invitation-public/resource";
import { invitationPublish } from "./functions/invitation-publish/resource";
import { staffAdmin } from "./functions/staff-admin/resource";
import { storage } from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  staffAdmin,
  storage,
  invitationPublish,
  invitationPublic,
  invitationLifecycle,
});

// Staff accounts are created only by the owner (admin:create, /admin/staff); nobody can sign themselves up.
backend.auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
  "AdminCreateUserConfig.AllowAdminCreateUserOnly",
  true,
);

backend.staffAdmin.addEnvironment("STAFF_USER_POOL_ID", backend.auth.resources.userPool.userPoolId);

// invitation-publish writes link names and live copies directly, in one transaction across both tables.
const tables = backend.data.resources.tables;
for (const name of ["Invitation", "InvitationSlug"]) {
  tables[name].grantReadWriteData(backend.invitationPublish.resources.lambda);
}
backend.invitationPublish.addEnvironment("INVITATION_TABLE", tables["Invitation"].tableName);
backend.invitationPublish.addEnvironment("INVITATION_SLUG_TABLE", tables["InvitationSlug"].tableName);

// invitation-public serves guests, so it can only read: no write access to either table.
tables["Invitation"].grantReadData(backend.invitationPublic.resources.lambda);
tables["InvitationSlug"].grantReadData(backend.invitationPublic.resources.lambda);
backend.invitationPublic.addEnvironment("INVITATION_TABLE", tables["Invitation"].tableName);
backend.invitationPublic.addEnvironment("INVITATION_SLUG_TABLE", tables["InvitationSlug"].tableName);

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

// invitation-lifecycle (staff transitions + the daily 03:00 IST job) changes invitations and erases expired ones:
// their record, their link name and their own files under invitations/<id>/ — nothing else in the bucket.
const lifecycleFn = backend.invitationLifecycle.resources.lambda;
tables["Invitation"].grantReadWriteData(lifecycleFn);
tables["InvitationSlug"].grantReadWriteData(lifecycleFn);
// bucket.grantRead would allow s3:List* on the whole bucket (no prefix condition) plus GetObject, which erasing
// doesn't need. Instead: list only under invitations/, and delete only objects under invitations/.
lifecycleFn.addToRolePolicy(
  new PolicyStatement({
    sid: "ListInvitationMediaOnly",
    effect: Effect.ALLOW,
    actions: ["s3:ListBucket"],
    resources: [bucket.bucketArn],
    conditions: { StringLike: { "s3:prefix": ["invitations/*"] } },
  }),
);
bucket.grantDelete(lifecycleFn, "invitations/*");
backend.invitationLifecycle.addEnvironment("INVITATION_MEDIA_BUCKET", bucket.bucketName);
backend.invitationLifecycle.addEnvironment("INVITATION_TABLE", tables["Invitation"].tableName);
backend.invitationLifecycle.addEnvironment("INVITATION_SLUG_TABLE", tables["InvitationSlug"].tableName);
