import { describe, expect, it, vi } from "vitest";
import { createOwner, inviteStaff, listStaff, normaliseEmail, removeStaff, StaffError } from "./staff";

const POOL = "ap-south-1_TEST";

function cognitoError(name: string) {
  return Object.assign(new Error(name), { name });
}

/** A fake Cognito client. Handlers are keyed by command class name and receive the command input. */
function fakeCognito(handlers: Record<string, (input: any) => any>) {
  const send = vi.fn(async (command: any) => {
    const handler = handlers[command.constructor.name];
    if (!handler) throw new Error(`Unexpected ${command.constructor.name}`);
    return handler(command.input);
  });
  const calls = (name: string) =>
    send.mock.calls.filter(([command]) => command.constructor.name === name).map(([command]) => command.input);
  return { send, calls };
}

function cognitoUser(username: string, email: string, status = "CONFIRMED", name?: string) {
  return {
    Username: username,
    UserStatus: status,
    Enabled: true,
    UserCreateDate: new Date("2026-10-01T10:00:00Z"),
    Attributes: [{ Name: "email", Value: email }, ...(name ? [{ Name: "name", Value: name }] : [])],
  };
}

describe("normaliseEmail", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Priya.Sharma@Example.COM ")).toBe("priya.sharma@example.com");
  });

  it("rejects something that isn't an email", () => {
    expect(() => normaliseEmail("priya")).toThrow(StaffError);
    expect(() => normaliseEmail("")).toThrow("Enter a valid email address.");
  });
});

describe("listStaff", () => {
  it("pages through the admin group, marks the owner and lists them first", async () => {
    const cognito = fakeCognito({
      ListUsersInGroupCommand: ({ GroupName, NextToken }) => {
        if (GroupName === "owner") return { Users: [cognitoUser("u-owner", "owner@example.com")] };
        if (!NextToken) return { Users: [cognitoUser("u-zara", "zara@example.com")], NextToken: "page-2" };
        return {
          Users: [
            cognitoUser("u-owner", "owner@example.com"),
            cognitoUser("u-amit", "amit@example.com", "FORCE_CHANGE_PASSWORD", "Amit"),
          ],
        };
      },
    });

    const staff = await listStaff(cognito, POOL);

    expect(staff.map((m) => m.username)).toEqual(["u-owner", "u-amit", "u-zara"]);
    expect(staff[0]).toMatchObject({ isOwner: true, status: "active", email: "owner@example.com" });
    expect(staff[1]).toEqual({
      username: "u-amit",
      email: "amit@example.com",
      name: "Amit",
      status: "invited",
      isOwner: false,
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    expect(cognito.calls("ListUsersInGroupCommand").filter((i) => i.GroupName === "admin")).toHaveLength(2);
  });
});

describe("inviteStaff", () => {
  it("creates a new user with a verified email, emails the invite and adds them to the admin group", async () => {
    const cognito = fakeCognito({
      AdminGetUserCommand: () => {
        throw cognitoError("UserNotFoundException");
      },
      AdminCreateUserCommand: () => ({ User: cognitoUser("u-new", "neha@example.com", "FORCE_CHANGE_PASSWORD", "Neha") }),
      AdminAddUserToGroupCommand: () => ({}),
    });

    const member = await inviteStaff(cognito, POOL, { email: " Neha@Example.com ", name: " Neha " });

    expect(cognito.calls("AdminCreateUserCommand")).toEqual([
      {
        UserPoolId: POOL,
        Username: "neha@example.com",
        DesiredDeliveryMediums: ["EMAIL"],
        UserAttributes: [
          { Name: "email", Value: "neha@example.com" },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: "Neha" },
        ],
      },
    ]);
    expect(cognito.calls("AdminAddUserToGroupCommand")).toEqual([
      { UserPoolId: POOL, Username: "neha@example.com", GroupName: "admin" },
    ]);
    expect(member).toMatchObject({ username: "u-new", status: "invited", isOwner: false });
  });

  it("leaves out the name attribute when no name is given", async () => {
    const cognito = fakeCognito({
      AdminGetUserCommand: () => {
        throw cognitoError("UserNotFoundException");
      },
      AdminCreateUserCommand: () => ({ User: cognitoUser("u-new", "neha@example.com", "FORCE_CHANGE_PASSWORD") }),
      AdminAddUserToGroupCommand: () => ({}),
    });

    await inviteStaff(cognito, POOL, { email: "neha@example.com", name: "   " });

    expect(cognito.calls("AdminCreateUserCommand")[0].UserAttributes).toEqual([
      { Name: "email", Value: "neha@example.com" },
      { Name: "email_verified", Value: "true" },
    ]);
  });

  it("resends the invitation when the person hasn't signed in yet", async () => {
    const cognito = fakeCognito({
      AdminGetUserCommand: () => ({
        Username: "u-new",
        UserStatus: "FORCE_CHANGE_PASSWORD",
        UserAttributes: [{ Name: "email", Value: "neha@example.com" }],
      }),
      AdminCreateUserCommand: () => ({ User: cognitoUser("u-new", "neha@example.com", "FORCE_CHANGE_PASSWORD") }),
      AdminAddUserToGroupCommand: () => ({}),
    });

    await inviteStaff(cognito, POOL, { email: "neha@example.com" });

    expect(cognito.calls("AdminCreateUserCommand")).toEqual([
      { UserPoolId: POOL, Username: "neha@example.com", DesiredDeliveryMediums: ["EMAIL"], MessageAction: "RESEND" },
    ]);
  });

  it("refuses to invite someone who is already active", async () => {
    const cognito = fakeCognito({
      AdminGetUserCommand: () => ({ Username: "u-1", UserStatus: "CONFIRMED", UserAttributes: [] }),
    });

    await expect(inviteStaff(cognito, POOL, { email: "neha@example.com" })).rejects.toThrow(
      "neha@example.com already has a staff account.",
    );
    expect(cognito.calls("AdminCreateUserCommand")).toHaveLength(0);
  });
});

describe("removeStaff", () => {
  const caller = { username: "u-owner", sub: "u-owner" };

  it("deletes a staff member", async () => {
    const cognito = fakeCognito({
      AdminListGroupsForUserCommand: () => ({ Groups: [{ GroupName: "admin" }] }),
      AdminDeleteUserCommand: () => ({}),
    });

    await expect(removeStaff(cognito, POOL, { username: "u-amit", caller })).resolves.toBe(true);
    expect(cognito.calls("AdminDeleteUserCommand")).toEqual([{ UserPoolId: POOL, Username: "u-amit" }]);
  });

  it("refuses to remove the caller's own account", async () => {
    const cognito = fakeCognito({});
    await expect(removeStaff(cognito, POOL, { username: "u-owner", caller })).rejects.toThrow(
      "You can't remove your own account.",
    );
  });

  it("refuses to remove the owner account", async () => {
    const cognito = fakeCognito({
      AdminListGroupsForUserCommand: () => ({ Groups: [{ GroupName: "admin" }, { GroupName: "owner" }] }),
    });
    await expect(removeStaff(cognito, POOL, { username: "u-other-owner", caller })).rejects.toThrow(
      "The owner account can't be removed.",
    );
    expect(cognito.calls("AdminDeleteUserCommand")).toHaveLength(0);
  });

  it("refuses to remove a user who isn't staff", async () => {
    const cognito = fakeCognito({ AdminListGroupsForUserCommand: () => ({ Groups: [] }) });
    await expect(removeStaff(cognito, POOL, { username: "u-x", caller })).rejects.toThrow(StaffError);
  });

  it("treats an already-deleted user as removed", async () => {
    const cognito = fakeCognito({
      AdminListGroupsForUserCommand: () => {
        throw cognitoError("UserNotFoundException");
      },
    });
    await expect(removeStaff(cognito, POOL, { username: "u-gone", caller })).resolves.toBe(true);
    expect(cognito.calls("AdminDeleteUserCommand")).toHaveLength(0);
  });
});

describe("createOwner", () => {
  it("invites a new owner and adds them to both groups", async () => {
    const cognito = fakeCognito({
      AdminGetUserCommand: () => {
        throw cognitoError("UserNotFoundException");
      },
      AdminCreateUserCommand: () => ({ User: cognitoUser("u-o", "owner@example.com", "FORCE_CHANGE_PASSWORD") }),
      AdminAddUserToGroupCommand: () => ({}),
    });

    await expect(createOwner(cognito, POOL, "Owner@Example.com")).resolves.toEqual({
      email: "owner@example.com",
      invited: true,
    });
    expect(cognito.calls("AdminAddUserToGroupCommand").map((i) => i.GroupName)).toEqual(["admin", "owner"]);
  });

  it("promotes an existing active user without sending a new invite", async () => {
    const cognito = fakeCognito({
      AdminGetUserCommand: () => ({ Username: "u-o", UserStatus: "CONFIRMED", UserAttributes: [] }),
      AdminAddUserToGroupCommand: () => ({}),
    });

    await expect(createOwner(cognito, POOL, "owner@example.com")).resolves.toEqual({
      email: "owner@example.com",
      invited: false,
    });
    expect(cognito.calls("AdminCreateUserCommand")).toHaveLength(0);
    expect(cognito.calls("AdminAddUserToGroupCommand").map((i) => i.GroupName)).toEqual(["admin", "owner"]);
  });
});
