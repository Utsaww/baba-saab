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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
