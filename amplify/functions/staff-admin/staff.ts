import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  ListUsersInGroupCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";

export const STAFF_GROUP = "admin";
export const OWNER_GROUP = "owner";

/** Anything with Cognito's `send`; the real client in Lambda and scripts, a fake in tests. */
export type StaffClient = { send(command: unknown): Promise<any> };

export type StaffMember = {
  username: string;
  email: string;
  name: string | null;
  status: "invited" | "active" | "disabled";
  isOwner: boolean;
  createdAt: string | null;
};

/** An error whose message is written for staff and safe to show on screen. */
export class StaffError extends Error {
  name = "StaffError";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(raw: string): string {
  const email = (raw ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) throw new StaffError("Enter a valid email address.");
  return email;
}

type CognitoUserLike = {
  Username?: string;
  UserStatus?: string;
  Enabled?: boolean;
  UserCreateDate?: Date | string;
  Attributes?: AttributeType[];
  UserAttributes?: AttributeType[];
};

function attribute(user: CognitoUserLike, name: string): string | null {
  const attributes = user.Attributes ?? user.UserAttributes ?? [];
  return attributes.find((a) => a.Name === name)?.Value ?? null;
}

function toStaffMember(user: CognitoUserLike, isOwner: boolean): StaffMember {
  let status: StaffMember["status"] = "active";
  if (user.Enabled === false) status = "disabled";
  else if (user.UserStatus === "FORCE_CHANGE_PASSWORD") status = "invited";
  return {
    username: user.Username ?? "",
    email: attribute(user, "email") ?? "",
    name: attribute(user, "name"),
    status,
    isOwner,
    createdAt: user.UserCreateDate ? new Date(user.UserCreateDate).toISOString() : null,
  };
}

async function findUser(client: StaffClient, userPoolId: string, username: string): Promise<CognitoUserLike | null> {
  try {
    return await client.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
  } catch (err) {
    if ((err as Error).name === "UserNotFoundException") return null;
    throw err;
  }
}

async function listGroupMembers(client: StaffClient, userPoolId: string, groupName: string) {
  const users: CognitoUserLike[] = [];
  let nextToken: string | undefined;
  do {
    const page = await client.send(
      new ListUsersInGroupCommand({ UserPoolId: userPoolId, GroupName: groupName, NextToken: nextToken }),
    );
    users.push(...(page.Users ?? []));
    nextToken = page.NextToken;
  } while (nextToken);
  return users;
}

function addToGroup(client: StaffClient, userPoolId: string, username: string, groupName: string) {
  return client.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: groupName }));
}

export async function listStaff(client: StaffClient, userPoolId: string): Promise<StaffMember[]> {
  const [staff, owners] = await Promise.all([
    listGroupMembers(client, userPoolId, STAFF_GROUP),
    listGroupMembers(client, userPoolId, OWNER_GROUP),
  ]);
  const ownerNames = new Set(owners.map((u) => u.Username));
  return staff
    .map((u) => toStaffMember(u, ownerNames.has(u.Username)))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.email.localeCompare(b.email));
}

export async function inviteStaff(
  client: StaffClient,
  userPoolId: string,
  input: { email: string; name?: string | null },
): Promise<StaffMember> {
  const email = normaliseEmail(input.email);
  const name = input.name?.trim() || null;
  const existing = await findUser(client, userPoolId, email);
  if (existing && existing.UserStatus !== "FORCE_CHANGE_PASSWORD") {
    throw new StaffError(`${email} already has a staff account.`);
  }

  // A pending invite is resent (fresh temporary password, new 7-day window) instead of failing.
  const created = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      DesiredDeliveryMediums: ["EMAIL"],
      ...(existing
        ? { MessageAction: "RESEND" }
        : {
            UserAttributes: [
              { Name: "email", Value: email },
              { Name: "email_verified", Value: "true" },
              ...(name ? [{ Name: "name", Value: name }] : []),
            ],
          }),
    }),
  );
  await addToGroup(client, userPoolId, email, STAFF_GROUP);
  return toStaffMember(created.User ?? {}, false);
}

export async function removeStaff(
  client: StaffClient,
  userPoolId: string,
  { username, caller }: { username: string; caller: { username: string; sub: string } },
): Promise<true> {
  if (username === caller.username || username === caller.sub) {
    throw new StaffError("You can't remove your own account.");
  }

  let groups: string[];
  try {
    const result = await client.send(new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username }));
    groups = (result.Groups ?? []).map((g: { GroupName?: string }) => g.GroupName ?? "");
  } catch (err) {
    // Already gone (another tab, a double click): the outcome staff wanted has happened.
    if ((err as Error).name === "UserNotFoundException") return true;
    throw err;
  }

  if (groups.includes(OWNER_GROUP)) throw new StaffError("The owner account can't be removed.");
  if (!groups.includes(STAFF_GROUP)) throw new StaffError("That person isn't a staff member.");

  await client.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));
  return true;
}

/** Used by `npm run admin:create`. Safe to rerun: an existing account is promoted, not re-invited. */
export async function createOwner(
  client: StaffClient,
  userPoolId: string,
  rawEmail: string,
): Promise<{ email: string; invited: boolean }> {
  const email = normaliseEmail(rawEmail);
  const existing = await findUser(client, userPoolId, email);
  const invited = !existing || existing.UserStatus === "FORCE_CHANGE_PASSWORD";
  if (invited) {
    await inviteStaff(client, userPoolId, { email });
  } else {
    await addToGroup(client, userPoolId, email, STAFF_GROUP);
  }
  await addToGroup(client, userPoolId, email, OWNER_GROUP);
  return { email, invited };
}
