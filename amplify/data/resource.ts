import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
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
      content: a.json().required(),
      version: a.integer().required(),
      createdBy: a.string().required(),
      updatedBy: a.string().required(),
    })
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
      updatedBy: a.string().required(),
    })
    .returns(a.ref("Invitation"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.custom({ dataSource: a.ref("Invitation"), entry: "./saveInvitation.js" })),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
