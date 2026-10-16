import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
import { invitationPublish } from "../functions/invitation-publish/resource";
import { invitationLifecycle } from "../functions/invitation-lifecycle/resource";
import { invitationPublic } from "../functions/invitation-public/resource";
import { staffAdmin } from "../functions/staff-admin/resource";

const schema = a.schema({
  StaffMember: a.customType({
    username: a.string().required(),
    email: a.string().required(),
    name: a.string(),
    status: a.string().required(),
    isOwner: a.boolean().required(),
    createdAt: a.string(),
  }),

  listStaff: a
    .query()
    .returns(a.ref("StaffMember").array())
    .authorization((allow) => [allow.group("owner")])
    .handler(a.handler.function(staffAdmin)),

  inviteStaff: a
    .mutation()
    .arguments({ email: a.string().required(), name: a.string() })
    .returns(a.ref("StaffMember"))
    .authorization((allow) => [allow.group("owner")])
    .handler(a.handler.function(staffAdmin)),

  removeStaff: a
    .mutation()
    .arguments({ username: a.string().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.group("owner")])
    .handler(a.handler.function(staffAdmin)),

  Invitation: a
    .model({
      status: a.string().required(),
      templateId: a.string().required(),
      mainDate: a.string(),
      coupleNames: a.string().required(),
      searchText: a.string().required(),
      musicTrackId: a.string(),
      content: a.json().required(),
      version: a.integer().required(),
      createdBy: a.string().required(),
      updatedBy: a.string().required(),
      slug: a.string(),
      previewToken: a.string(),
      publishedContent: a.json(),
      liveVersion: a.integer(),
      publishedAt: a.datetime(),
      liveUpdatedAt: a.datetime(),
      // Lifecycle (invitation-lifecycle): the date it goes offline by itself, when it did, and when it is erased.
      offlineOn: a.date(),
      offlineAt: a.datetime(),
      deletedAt: a.datetime(),
      statusBeforeDelete: a.string(),
      purgeAt: a.datetime(),
    })
    // No generated hard delete (staff were never allowed it): invitations are removed only through
    // softDeleteInvitation and the erase in invitation-lifecycle.
    .disableOperations(["delete"])
    // Staff can create and read; every change goes through saveInvitation's version check.
    .authorization((allow) => [allow.group("admin").to(["create", "read"])]),

  saveInvitation: a
    .mutation()
    .arguments({
      id: a.id().required(),
      expectedVersion: a.integer().required(),
      content: a.json().required(),
      templateId: a.string().required(),
      mainDate: a.string(),
      coupleNames: a.string().required(),
      searchText: a.string().required(),
      musicTrackId: a.string(),
      updatedBy: a.string().required(),
    })
    .returns(a.ref("Invitation"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.custom({ dataSource: a.ref("Invitation"), entry: "./saveInvitation.js" })),

  InvitationSlug: a
    .model({ slug: a.string().required(), invitationId: a.string().required() })
    .identifier(["slug"])
    // Written only by invitation-publish; staff read it to check whether a link name is free.
    .authorization((allow) => [allow.group("admin").to(["read"])]),

  setInvitationSlug: a
    .mutation()
    .arguments({ id: a.id().required(), slug: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  regeneratePreviewToken: a
    .mutation()
    .arguments({ id: a.id().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  publishInvitation: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required(), offlineOn: a.date() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  updateLiveInvitation: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationPublish)),

  // Offline, delete, restore and erase. Each staff change is conditioned on the version and status it read.
  takeInvitationOffline: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationLifecycle)),

  putInvitationOnline: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required(), offlineOn: a.date().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationLifecycle)),

  setInvitationOfflineOn: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required(), offlineOn: a.date().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationLifecycle)),

  // Not "deleteInvitation": that name belonged to the model's generated delete, and replacing its resolver with a
  // custom one in the same deploy fails (the old resolver is only removed in CloudFormation's cleanup phase).
  softDeleteInvitation: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationLifecycle)),

  restoreInvitation: a
    .mutation()
    .arguments({ id: a.id().required(), expectedVersion: a.integer().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationLifecycle)),

  eraseInvitationNow: a
    .mutation()
    .arguments({ id: a.id().required(), confirm: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(invitationLifecycle)),

  PublicInvitation: a.customType({
    mode: a.string().required(),
    templateId: a.string().required(),
    content: a.json().required(),
  }),

  // The only thing guests (no login) can call. It enforces every visibility rule itself.
  publicInvitation: a
    .query()
    .arguments({ slug: a.string().required(), previewToken: a.string() })
    .returns(a.ref("PublicInvitation"))
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(invitationPublic)),

  MusicTrack: a
    .model({
      name: a.string().required(),
      key: a.string().required(),
      durationSec: a.integer(),
      createdBy: a.string().required(),
    })
    .authorization((allow) => [allow.group("admin")]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
