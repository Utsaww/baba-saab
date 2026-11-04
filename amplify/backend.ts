import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineBackend } from "@aws-amplify/backend";
import { DockerImage, Duration, Size, Stack } from "aws-cdk-lib";
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { invitationLifecycle } from "./functions/invitation-lifecycle/resource";
import { invitationPublic } from "./functions/invitation-public/resource";
import { invitationPublish } from "./functions/invitation-publish/resource";
import { rsvpGuest } from "./functions/rsvp-guest/resource";
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
  rsvpGuest,
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
// Erasing an invitation erases its RSVPs too (before the record).
tables["Rsvp"].grantReadWriteData(lifecycleFn);
backend.invitationLifecycle.addEnvironment("RSVP_TABLE", tables["Rsvp"].tableName);

// rsvp-guest is reachable without any login, so its role lists exactly the calls its code makes — no table-wide
// grantReadData (that includes Scan, which would expose every invitation's tokens and drafts) and no delete or
// batch writes. If the code ever needs another call, add it here on purpose.
const rsvpGuestFn = backend.rsvpGuest.resources.lambda;
rsvpGuestFn.addToRolePolicy(
  new PolicyStatement({
    sid: "ReadInvitationAndLinkName",
    effect: Effect.ALLOW,
    actions: ["dynamodb:GetItem"],
    resources: [tables["Invitation"].tableArn, tables["InvitationSlug"].tableArn],
  }),
);
// Replies: look up an earlier reply (GetItem), save one (PutItem), list them for the family page (Query).
rsvpGuestFn.addToRolePolicy(
  new PolicyStatement({
    sid: "ReadWriteReplies",
    effect: Effect.ALLOW,
    actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"],
    resources: [tables["Rsvp"].tableArn],
  }),
);
// Rate limits: one atomic conditional UpdateItem per counter; nothing reads them back.
rsvpGuestFn.addToRolePolicy(
  new PolicyStatement({
    sid: "CountRateLimits",
    effect: Effect.ALLOW,
    actions: ["dynamodb:UpdateItem"],
    resources: [tables["RsvpLimit"].tableArn],
  }),
);
// The one write it needs on Invitation: bumping the "N new replies" count, and nothing else on that table.
rsvpGuestFn.addToRolePolicy(
  new PolicyStatement({
    sid: "BumpRsvpNewCountOnly",
    effect: Effect.ALLOW,
    actions: ["dynamodb:UpdateItem"],
    resources: [tables["Invitation"].tableArn],
    conditions: { "ForAllValues:StringEquals": { "dynamodb:Attributes": ["id", "rsvpNewCount"] } },
  }),
);
// Salt for hashing guests' network addresses into rate-limit keys. A fresh random value at every synth, so it
// rotates on each deploy; that only resets the current hourly windows. Never committed, never logged.
backend.rsvpGuest.addEnvironment("RSVP_IP_SALT", randomBytes(32).toString("hex"));
backend.rsvpGuest.addEnvironment("INVITATION_TABLE", tables["Invitation"].tableName);
backend.rsvpGuest.addEnvironment("INVITATION_SLUG_TABLE", tables["InvitationSlug"].tableName);
backend.rsvpGuest.addEnvironment("RSVP_TABLE", tables["Rsvp"].tableName);
backend.rsvpGuest.addEnvironment("RSVP_LIMIT_TABLE", tables["RsvpLimit"].tableName);

// Rate-limit counters delete themselves once their hour is over (DynamoDB TTL on expiresAt, epoch seconds).
backend.data.resources.cfnResources.amplifyDynamoDbTables["RsvpLimit"].timeToLiveAttribute = {
  attributeName: "expiresAt",
  enabled: true,
};

// invitation-video-render plays the live page in headless Chromium and encodes an MP4 (spec §6). It lives in the
// data stack: the start function there must reference it, and a separate stack would make a circular dependency.
// Chromium, Playwright and ffmpeg are too big to bundle, so they come from a layer built with plain npm (no Docker).
const videoLayerDir = fileURLToPath(new URL("./layers/video", import.meta.url));
const videoLayer = new LayerVersion(Stack.of(tables["Invitation"]), "InvitationVideoLayer", {
  compatibleRuntimes: [Runtime.NODEJS_22_X],
  code: Code.fromAsset(videoLayerDir, {
    exclude: ["node_modules"], // the install output below, not a source
    bundling: {
      image: DockerImage.fromRegistry("none"),
      local: {
        tryBundle(out) {
          // ffmpeg-static downloads its binary at install time: ask for Lambda's, whatever machine builds this.
          execSync("npm ci --omit=dev", {
            cwd: videoLayerDir,
            stdio: "inherit",
            env: { ...process.env, npm_config_platform: "linux", npm_config_arch: "x64" },
          });
          cpSync(`${videoLayerDir}/node_modules`, `${out}/nodejs/node_modules`, { recursive: true });
          return true;
        },
      },
    },
  }),
});
// The page is recorded on the deployment that started the job, so a preview branch records its own preview site.
const amplifyHost = process.env.AWS_BRANCH && process.env.AWS_APP_ID
  ? `https://${process.env.AWS_BRANCH.replace(/\//g, "-")}.${process.env.AWS_APP_ID}.amplifyapp.com`
  : undefined;
const videoSiteOrigin = process.env.VIDEO_SITE_ORIGIN ?? amplifyHost;
if (!videoSiteOrigin) {
  throw new Error("Set VIDEO_SITE_ORIGIN (e.g. http://localhost:3000) to synth outside an Amplify build: the video recorder needs the site to load.");
}
const renderFn = new NodejsFunction(Stack.of(tables["Invitation"]), "InvitationVideoRender", {
  entry: fileURLToPath(new URL("./functions/invitation-video-render/handler.ts", import.meta.url)),
  runtime: Runtime.NODEJS_22_X,
  memorySize: 10240,
  timeout: Duration.seconds(290),
  ephemeralStorageSize: Size.gibibytes(4),
  layers: [videoLayer],
  bundling: { externalModules: ["@sparticuz/chromium", "playwright-core", "ffmpeg-static", "@aws-sdk/*"] },
  environment: {
    INVITATION_TABLE: tables["Invitation"].tableName,
    INVITATION_MEDIA_BUCKET: bucket.bucketName,
    VIDEO_SITE_ORIGIN: videoSiteOrigin,
  },
});
// No automatic retries: a retry would render again and could turn a job already marked failed into ready.
renderFn.configureAsyncInvoke({ retryAttempts: 0 });
// It reads the previous video's key and writes the job result on Invitation; it never scans, puts or deletes rows.
renderFn.addToRolePolicy(
  new PolicyStatement({
    sid: "ReadWriteInvitationVideoJob",
    effect: Effect.ALLOW,
    actions: ["dynamodb:GetItem", "dynamodb:UpdateItem"],
    resources: [tables["Invitation"].tableArn],
  }),
);
// It uploads the MP4 and removes the one it replaces, only inside each invitation's video/ folder. Music is read
// by its public URL like a guest's phone, so no GetObject.
renderFn.addToRolePolicy(
  new PolicyStatement({
    sid: "WriteInvitationVideosOnly",
    effect: Effect.ALLOW,
    actions: ["s3:PutObject", "s3:DeleteObject"],
    resources: [bucket.arnForObjects("invitations/*/video/*")],
  }),
);
