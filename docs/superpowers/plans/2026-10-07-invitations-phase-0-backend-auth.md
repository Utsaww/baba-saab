# Digital Invitations — Phase 0 (Backend & Staff Auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AWS Amplify Gen 2 backend with Cognito staff sign-in, so every `/admin` page requires a staff login, the owner is created with `npm run admin:create -- <email>`, and the owner invites and removes staff at `/admin/staff`.

**Architecture:** A TypeScript `amplify/` folder defines the backend: a Cognito user pool (email login, self-signup off, `owner` and `admin` groups) and an Amplify Data API whose only operations are three owner-only custom operations (`listStaff`, `inviteStaff`, `removeStaff`). These are backed by one Lambda, `staff-admin`, which holds the Cognito rules in a pure, unit-tested module. The admin script reuses that module. In the Next.js app, a middleware plus server-side `requireStaff()`/`requireOwner()` guards protect `/admin`, and all access decisions live in one pure module, `src/AdminModule/auth/access.js`. The login page uses Amplify UI's `<Authenticator>`, which covers sign-in, the first-login new-password step and forgot-password. The existing admin pages move into a `(staff)` route group whose layout requires a login. URLs stay the same.

**Tech Stack:** AWS Amplify Gen 2 (`@aws-amplify/backend`, `@aws-amplify/backend-cli`), Cognito, AppSync, Lambda (Node), `aws-amplify` v6, `@aws-amplify/adapter-nextjs`, `@aws-amplify/ui-react`, `@aws-sdk/client-cognito-identity-provider`, `tsx`, Next.js 14.2 App Router, Vitest 2 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-digital-invitations-design.md` (§6 Routes, §7 Code structure, §10 Security, §13 Staff documentation, §14 Phase 0, §15 Prerequisites)

## Global Constraints

- Work on branch `feature/invitations`; never commit to `main` (the owner cherry-picks to `main` for rollback safety). Do not push or merge without the owner's approval.
- The app (`src/`) stays JavaScript only. `amplify/` is TypeScript because Amplify Gen 2 requires `amplify/backend.ts`; it has its own `amplify/tsconfig.json` and `amplify/package.json` (`"type": "module"`). Nothing in `src/` imports from `amplify/`; the app reads only the generated `amplify_outputs.json`.
- Import alias `@/*` → `src/*`.
- Cognito groups are exactly `owner` and `admin`. Every staff member, the owner included, is in `admin`. Only the owner is also in `owner`.
- Self-signup is disabled (`AllowAdminCreateUserOnly: true`). Staff are created only by `npm run admin:create` (owner) or from `/admin/staff` (staff).
- New staff get a Cognito email with a temporary password (valid 7 days, Cognito's default) and choose their own password at first sign-in.
- Staff access is enforced in **three** places: the middleware, server-side `requireStaff()`/`requireOwner()` in layouts, pages and server actions, and AppSync `allow.group("owner")` plus a group check inside the Lambda.
- `amplify_outputs.json` and `.amplify/` are generated and git-ignored; never commit them.
- Unit tests never import `amplify_outputs.json` or call AWS. Cognito is replaced by a fake client in tests.
- The invitation email's sign-in link uses `process.env.ADMIN_SITE_URL`, falling back to `http://localhost:3000` (the sandbox). Deployed branches set `ADMIN_SITE_URL` in the Amplify console.
- Admin pages are `noindex` (inherited from `src/app/(admin)/layout.js`).
- Every staff-facing change updates `docs/admin-guide.md` in the same task, in plain language for non-technical staff.
- Touch targets ≥ 44px (`min-h-[44px]`).
- User-facing error messages are plain sentences that say what to do next. Raw AWS errors are logged, never shown.

## Review Focus

1. **A signed-in staff member who isn't the owner opens `/admin/staff` directly or calls a staff action.** They are redirected to `/admin` by the middleware and page guard, and AppSync and the Lambda refuse the operation. `/admin/staffing`-style lookalike paths are not treated as owner-only. Pinned in Task 4 (`decideAdminAccess` owner-only cases) and Task 2 (`handler rejects callers outside the owner group`).
2. **An open redirect via `?next=`.** `/admin/login?next=https://evil.example`, `//evil.example` and `/admin\evil` all land on `/admin` after sign-in. Pinned in Task 4 (`safeNextPath` tests).
3. **Re-inviting someone.** If an invite is still pending (for example, the 7-day temporary password expired), "invite" resends it rather than erroring. If the person is already active, staff get a clear message. Uppercase or padded emails are normalised. Pinned in Task 2 (`inviteStaff` tests).
4. **Removing the wrong account, or removing twice.** The owner cannot remove themselves or the owner account. Removing someone already deleted (two tabs, double click) succeeds quietly. Pinned in Task 2 (`removeStaff` tests).
5. **A signed-in Cognito user who isn't in the `admin` group** (for example, created by hand in the AWS console). They see a "no access" notice with a Sign out button, never a redirect loop. Pinned in Task 4 (`decideAdminAccess` no-access) and Task 5 (`LoginPanel` no-access test).

---

## File Structure

```
amplify/
  package.json                     {"type":"module"} so ampx/tsx treat amplify/ as ESM
  tsconfig.json                    Amplify's own TS config (strict, $amplify/* paths)
  backend.ts                       defineBackend({ auth, data, staffAdmin }); self-signup off; env wiring
  auth/resource.ts                 Cognito: email login, groups, invitation email, staff-admin access
  data/resource.ts                 Amplify Data schema: StaffMember type + 3 owner-only custom operations
  functions/staff-admin/
    resource.ts                    defineFunction (lives in the auth stack)
    staff.ts                       PURE-ish Cognito rules: listStaff, inviteStaff, removeStaff, createOwner
    staff.test.ts                  tests with a fake Cognito client
    handler.ts                     AppSync → staff.ts dispatcher, owner check, error hiding
    handler.test.ts
  scripts/
    args.ts                        parseAdminCreateArgs (pure)
    args.test.ts
    admin-create.ts                `npm run admin:create -- <email>` entry point
src/
  middleware.js                    guards /admin/* using access.js
  AdminModule/
    auth/
      access.js                    PURE: groups, decideAdminAccess, safeNextPath, sessionFromTokens
      access.test.js
      amplifyServer.js             createServerRunner(amplify_outputs.json)
      server.js                    getStaffSession, requireStaff, requireOwner
      ConfigureAmplify.jsx         client-side Amplify.configure(outputs, { ssr: true })
      LoginPanel.jsx               <Authenticator hideSignUp> + no-access notice + redirect
      LoginPanel.test.jsx
      SignOutButton.jsx
    AdminShell.jsx                 (modify) role-aware nav, signed-in email, Sign out
    AdminShell.test.jsx
    GuideBanner.jsx                "New here? Read the 5-minute guide" (dismissible, per staff member)
    GuideBanner.test.jsx
    staff/
      format.js                    statusLabel, formatAddedDate, errorMessage, OFFLINE_MESSAGE
      format.test.js
      dataClient.js                cookie-based Amplify Data client (server)
      actions.js                   "use server": inviteStaffAction, removeStaffAction
      InviteStaffForm.jsx
      InviteStaffForm.test.jsx
      StaffList.jsx
      StaffList.test.jsx
  app/(admin)/
    layout.js                      (modify) html/body + ConfigureAmplify; no shell
    admin/login/page.js            sign-in page (no shell)
    admin/(staff)/layout.js        requireStaff() + AdminShell
    admin/(staff)/page.js          dashboard shell (moved from admin/page.js and rewritten)
    admin/(staff)/help/page.js     (moved) guide import path gains one ../
    admin/(staff)/templates/...    (moved unchanged)
    admin/(staff)/staff/page.js    owner-only staff management
amplify.yml                        Amplify Hosting build: backend pipeline-deploy + Next build
vitest.config.mjs                  (modify) include amplify tests, node env for them
test/setup.js                      (modify) guard browser-only stubs for the node environment
.gitignore                         (modify) .amplify/, amplify_outputs*
package.json                       (modify) deps + "admin:create" script
README.md                          (modify) developer setup for the backend
docs/admin-guide.md                (modify) Signing in, Dashboard, Managing staff
```

---

### Task 1: AWS access and backend scaffold (auth only)

**Files:**
- Create: `amplify/package.json`, `amplify/tsconfig.json`, `amplify/backend.ts`, `amplify/auth/resource.ts`
- Modify: `package.json`, `package-lock.json`, `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a deployed sandbox user pool with groups `owner` and `admin`; `amplify_outputs.json` at the repo root containing `auth.user_pool_id`, `auth.aws_region`, `auth.groups`; the exported `auth` resource (Task 2 adds `access` to it); `backend` in `amplify/backend.ts` (Task 2 adds `data` and `staffAdmin`).

- [ ] **Step 1: Get the AWS prerequisites from the owner (manual, blocking)**

The local IAM user `babasaab` (account `940293952873`) can currently reach only S3. Ask the owner to do the following in the AWS console with an administrator login, and to send back the region and the Amplify app ID:

1. **IAM → Users → babasaab → Add permissions → Attach policies directly → `AmplifyBackendDeployFullAccess`** (an AWS-managed policy). This is what `npx ampx sandbox` needs.
2. **Amplify console → the Baba Saab app:** note the **region** (top-right of the console) and the **App ID** (App settings → General, e.g. `d1a2b3c4d5e6f7`).
3. If this region has never been used for CDK, open **https://console.aws.amazon.com/cloudformation/home?region=<region>#/stacks/quickcreate?templateURL=https%3A%2F%2Fs3.amazonaws.com%2Fcdk-bootstrap%2Fbootstrap-template.yaml&stackName=CDKToolkit** and create the `CDKToolkit` stack with the defaults. `ampx` also prints this link if bootstrapping is missing.

Then set the local default region to the app's region:

```bash
aws configure set region <region-from-owner>
aws sts get-caller-identity
```

Expected: `"Account": "940293952873"`. Stop here until the policy is attached. Every later step needs it.

- [ ] **Step 2: Install the Amplify packages**

```bash
npm install aws-amplify @aws-amplify/adapter-nextjs @aws-amplify/ui-react
npm install --save-dev @aws-amplify/backend @aws-amplify/backend-cli aws-cdk-lib constructs typescript tsx esbuild @types/aws-lambda @aws-sdk/client-cognito-identity-provider
```

Expected: installs finish without peer-dependency errors. `aws-amplify` resolves to 6.x, which supports Next.js `>=13.5 <16`.

- [ ] **Step 3: Ignore generated backend files**

Append to `.gitignore`:

```gitignore

# amplify gen 2
.amplify/
amplify_outputs*
amplifyconfiguration*
```

- [ ] **Step 4: Create the amplify package files**

`amplify/package.json`:

```json
{
  "type": "module"
}
```

`amplify/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "$amplify/*": ["../.amplify/generated/*"]
    }
  }
}
```

- [ ] **Step 5: Define auth**

`amplify/auth/resource.ts`:

```ts
import { defineAuth } from "@aws-amplify/backend";

// Shown in the invitation email Cognito sends new staff. Deployed branches set ADMIN_SITE_URL
// in the Amplify console; the sandbox falls back to the local dev server.
const SITE_URL = process.env.ADMIN_SITE_URL ?? "http://localhost:3000";

export const auth = defineAuth({
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: "Your Baba Saab Invitations staff account",
        emailBody: (user, code) =>
          [
            "Hello,",
            "You have been added as staff on Baba Saab Invitations.",
            `Sign in at ${SITE_URL}/admin/login`,
            `Email: ${user()}`,
            `Temporary password: ${code()}`,
            "You will choose your own password the first time you sign in. The temporary password works for 7 days.",
          ].join("<br><br>"),
      },
    },
  },
  groups: ["owner", "admin"],
});
```

`user` and `code` are functions and must be called. Passing them uncalled fails the deploy.

- [ ] **Step 6: Define the backend and turn off self-signup**

`amplify/backend.ts`:

```ts
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

const backend = defineBackend({ auth });

// Staff accounts are created only by the owner (admin:create, /admin/staff); nobody can sign themselves up.
backend.auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
  "AdminCreateUserConfig.AllowAdminCreateUserOnly",
  true,
);
```

`addPropertyOverride` changes only that one flag and keeps the invitation email template from Step 5. Assigning `adminCreateUserConfig` directly would erase the template.

- [ ] **Step 7: Deploy the sandbox once**

```bash
npx ampx sandbox --once
```

Expected: ends with `Deployment completed` and writes `amplify_outputs.json` at the repo root. If it reports a missing bootstrap, do Step 1.3 and rerun. If it reports `AccessDenied`, the Step 1.1 policy isn't attached yet.

- [ ] **Step 8: Verify the user pool**

```bash
node -e "const o=require('./amplify_outputs.json');console.log(o.auth.user_pool_id,o.auth.aws_region,JSON.stringify(o.auth.groups))"
aws cognito-idp describe-user-pool --user-pool-id <user_pool_id-from-above> --query "UserPool.AdminCreateUserConfig"
```

Expected: the outputs list both groups (`owner`, `admin`). The describe output shows `"AllowAdminCreateUserOnly": true` and an `InviteMessageTemplate` whose `EmailSubject` is `Your Baba Saab Invitations staff account`. (The user `babasaab` may lack `cognito-idp:DescribeUserPool`. If so, check the same values in the Cognito console under **Sign-up** and **Messaging**.)

- [ ] **Step 9: Make sure the app still builds and tests pass**

```bash
npm test
npx next build
```

Expected: all existing tests pass; the build succeeds (nothing imports the backend yet).

- [ ] **Step 10: Commit**

```bash
git add .gitignore package.json package-lock.json amplify/
git commit -m "feat(backend): scaffold Amplify Gen 2 auth with staff groups"
```

---

### Task 2: Staff management backend (`staff-admin` function + Data API)

**Files:**
- Create: `amplify/functions/staff-admin/staff.ts`, `amplify/functions/staff-admin/staff.test.ts`, `amplify/functions/staff-admin/handler.ts`, `amplify/functions/staff-admin/handler.test.ts`, `amplify/functions/staff-admin/resource.ts`, `amplify/data/resource.ts`
- Modify: `amplify/auth/resource.ts`, `amplify/backend.ts`, `vitest.config.mjs`, `test/setup.js`

**Interfaces:**
- Consumes: `auth` and `backend` from Task 1.
- Produces:
  - `amplify/functions/staff-admin/staff.ts` exports:
    - `STAFF_GROUP = "admin"`, `OWNER_GROUP = "owner"`
    - `class StaffError extends Error`, whose messages are safe to show staff
    - `type StaffClient = { send(command: unknown): Promise<any> }`
    - `type StaffMember = { username: string; email: string; name: string | null; status: "invited" | "active" | "disabled"; isOwner: boolean; createdAt: string | null }`
    - `normaliseEmail(raw: string): string` (throws `StaffError`)
    - `listStaff(client, userPoolId): Promise<StaffMember[]>`, with the owner first, then the rest sorted by email
    - `inviteStaff(client, userPoolId, { email, name? }): Promise<StaffMember>`
    - `removeStaff(client, userPoolId, { username, caller: { username, sub } }): Promise<true>`
    - `createOwner(client, userPoolId, email): Promise<{ email: string; invited: boolean }>`
  - Amplify Data operations (owner group only): `listStaff(): [StaffMember]`, `inviteStaff(email: String!, name: String): StaffMember`, `removeStaff(username: String!): Boolean`. In the app: `client.queries.listStaff()`, `client.mutations.inviteStaff({ email, name })`, `client.mutations.removeStaff({ username })`, each resolving to `{ data, errors }`.

- [ ] **Step 1: Let Vitest run amplify tests in Node**

`vitest.config.mjs` — replace the `test` block:

```js
  test: {
    environment: "jsdom",
    // Backend code runs in Lambda/Node, not a browser.
    environmentMatchGlobs: [["amplify/**", "node"]],
    setupFiles: ["./test/setup.js"],
    include: ["src/**/*.test.{js,jsx}", "amplify/**/*.test.ts"],
  },
```

`test/setup.js` — replace the last block (from the `// jsdom has no canvas` comment to the end):

```js
// jsdom has no canvas or media playback; components must cope with that anyway.
// Backend tests run in plain Node, where these browser globals don't exist.
if (typeof window !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
}
```

Run: `npm test`
Expected: every existing test still passes.

- [ ] **Step 2: Write the failing staff rules tests**

`amplify/functions/staff-admin/staff.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run amplify/functions/staff-admin/staff.test.ts`
Expected: FAIL — `Failed to resolve import "./staff"`.

- [ ] **Step 4: Implement the staff rules**

`amplify/functions/staff-admin/staff.ts`:

```ts
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
```

- [ ] **Step 5: Run the staff tests to verify they pass**

Run: `npx vitest run amplify/functions/staff-admin/staff.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 6: Write the failing handler tests**

`amplify/functions/staff-admin/handler.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./staff", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./staff")>();
  return {
    ...actual,
    listStaff: vi.fn(async () => [{ username: "u-owner" }]),
    inviteStaff: vi.fn(async () => ({ username: "u-new" })),
    removeStaff: vi.fn(async () => true as const),
  };
});

import { handler } from "./handler";
import { inviteStaff, listStaff, removeStaff, StaffError } from "./staff";

function event(fieldName: string, args: Record<string, unknown> = {}, groups: string[] | null = ["admin", "owner"]) {
  return { info: { fieldName }, arguments: args, identity: { username: "u-owner", sub: "u-owner", groups } };
}

describe("staff-admin handler", () => {
  beforeEach(() => {
    vi.stubEnv("STAFF_USER_POOL_ID", "ap-south-1_TEST");
    vi.mocked(listStaff).mockClear();
  });

  it("rejects callers outside the owner group", async () => {
    await expect(handler(event("listStaff", {}, ["admin"]))).rejects.toThrow("Only the owner can manage staff.");
    await expect(handler(event("listStaff", {}, null))).rejects.toThrow("Only the owner can manage staff.");
    expect(listStaff).not.toHaveBeenCalled();
  });

  it("dispatches each operation with the user pool id", async () => {
    await expect(handler(event("listStaff"))).resolves.toEqual([{ username: "u-owner" }]);
    expect(listStaff).toHaveBeenCalledWith(expect.anything(), "ap-south-1_TEST");

    await handler(event("inviteStaff", { email: "a@example.com", name: "A" }));
    expect(inviteStaff).toHaveBeenCalledWith(expect.anything(), "ap-south-1_TEST", { email: "a@example.com", name: "A" });

    await handler(event("removeStaff", { username: "u-amit" }));
    expect(removeStaff).toHaveBeenCalledWith(expect.anything(), "ap-south-1_TEST", {
      username: "u-amit",
      caller: { username: "u-owner", sub: "u-owner" },
    });
  });

  it("passes staff-facing errors through", async () => {
    vi.mocked(listStaff).mockRejectedValueOnce(new StaffError("You can't remove your own account."));
    await expect(handler(event("listStaff"))).rejects.toThrow("You can't remove your own account.");
  });

  it("hides unexpected AWS errors behind a friendly message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(listStaff).mockRejectedValueOnce(new Error("AccessDeniedException: arn:aws:iam::123:role/x"));
    await expect(handler(event("listStaff"))).rejects.toThrow(
      "Something went wrong talking to the sign-in service. Please try again.",
    );
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("rejects unknown operations", async () => {
    await expect(handler(event("dropTables"))).rejects.toThrow();
  });
});
```

- [ ] **Step 7: Run the handler tests to verify they fail**

Run: `npx vitest run amplify/functions/staff-admin/handler.test.ts`
Expected: FAIL — `Failed to resolve import "./handler"`.

- [ ] **Step 8: Implement the handler and function resource**

`amplify/functions/staff-admin/handler.ts`:

```ts
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { inviteStaff, listStaff, OWNER_GROUP, removeStaff, StaffError } from "./staff";

type StaffEvent = {
  info: { fieldName: string };
  arguments: Record<string, any>;
  identity: { username: string; sub: string; groups?: string[] | null } | null;
};

const client = new CognitoIdentityProviderClient();

export const handler = async (event: StaffEvent) => {
  const caller = event.identity;
  // AppSync already limits these operations to the owner group; this is the second lock.
  if (!caller?.groups?.includes(OWNER_GROUP)) throw new StaffError("Only the owner can manage staff.");

  const userPoolId = process.env.STAFF_USER_POOL_ID ?? "";
  try {
    switch (event.info.fieldName) {
      case "listStaff":
        return await listStaff(client, userPoolId);
      case "inviteStaff":
        return await inviteStaff(client, userPoolId, event.arguments as { email: string; name?: string | null });
      case "removeStaff":
        return await removeStaff(client, userPoolId, {
          username: event.arguments.username,
          caller: { username: caller.username, sub: caller.sub },
        });
      default:
        throw new StaffError(`Unknown operation ${event.info.fieldName}.`);
    }
  } catch (err) {
    if (err instanceof StaffError) throw err;
    console.error("staff-admin failed", event.info.fieldName, err);
    throw new Error("Something went wrong talking to the sign-in service. Please try again.");
  }
};
```

`amplify/functions/staff-admin/resource.ts`:

```ts
import { defineFunction } from "@aws-amplify/backend";

export const staffAdmin = defineFunction({
  name: "staff-admin",
  entry: "./handler.ts",
  timeoutSeconds: 15,
  // Kept in the auth stack: it needs user pool permissions and is called by the data API,
  // and placing it with auth avoids a circular dependency between the auth and data stacks.
  resourceGroupName: "auth",
});
```

- [ ] **Step 9: Run the handler tests to verify they pass**

Run: `npx vitest run amplify/functions/staff-admin`
Expected: PASS (both files).

- [ ] **Step 10: Grant the function its Cognito permissions**

`amplify/auth/resource.ts` — add the import at the top and an `access` property after `groups`:

```ts
import { staffAdmin } from "../functions/staff-admin/resource";
```

```ts
  groups: ["owner", "admin"],
  access: (allow) => [
    allow
      .resource(staffAdmin)
      .to(["createUser", "deleteUser", "getUser", "listUsersInGroup", "listGroupsForUser", "addUserToGroup"]),
  ],
```

- [ ] **Step 11: Define the Data API**

`amplify/data/resource.ts`:

```ts
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
```

- [ ] **Step 12: Wire the backend**

`amplify/backend.ts` — replace the file:

```ts
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
```

- [ ] **Step 13: Deploy and check the API exists**

```bash
npx ampx sandbox --once
node -e "const o=require('./amplify_outputs.json');console.log(o.data.url, Object.keys(o.data.model_introspection.queries||{}), Object.keys(o.data.model_introspection.mutations||{}))"
```

Expected: `Deployment completed`; the second command prints an AppSync URL, `[ 'listStaff' ]` and `[ 'inviteStaff', 'removeStaff' ]`.

Troubleshooting: if synth fails with a circular dependency between the `auth` and `data` stacks, confirm `resourceGroupName: "auth"` is set in Step 8. If it rejects a schema without models, report the exact error before changing the design.

- [ ] **Step 14: Run all tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 15: Commit**

```bash
git add vitest.config.mjs test/setup.js amplify/
git commit -m "feat(backend): add owner-only staff management API"
```

---

### Task 3: `npm run admin:create` — create the owner account

**Files:**
- Create: `amplify/scripts/args.ts`, `amplify/scripts/args.test.ts`, `amplify/scripts/admin-create.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `createOwner`, `StaffError` from `amplify/functions/staff-admin/staff.ts`.
- Produces: `parseAdminCreateArgs(argv: string[]): { email: string; outputsPath: string }`; the npm script `admin:create`, usage `npm run admin:create -- <email> [--outputs <path>]`.

- [ ] **Step 1: Write the failing argument tests**

`amplify/scripts/args.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseAdminCreateArgs } from "./args";

describe("parseAdminCreateArgs", () => {
  it("takes the email and defaults to the sandbox outputs file", () => {
    expect(parseAdminCreateArgs(["owner@example.com"])).toEqual({
      email: "owner@example.com",
      outputsPath: "amplify_outputs.json",
    });
  });

  it("accepts --outputs for a deployed branch", () => {
    expect(parseAdminCreateArgs(["--outputs", ".amplify/main/amplify_outputs.json", "owner@example.com"])).toEqual({
      email: "owner@example.com",
      outputsPath: ".amplify/main/amplify_outputs.json",
    });
  });

  it("explains usage when the email is missing", () => {
    expect(() => parseAdminCreateArgs([])).toThrow("Usage: npm run admin:create -- <email> [--outputs <path>]");
  });

  it("rejects --outputs without a path and extra arguments", () => {
    expect(() => parseAdminCreateArgs(["owner@example.com", "--outputs"])).toThrow("Usage:");
    expect(() => parseAdminCreateArgs(["a@example.com", "b@example.com"])).toThrow("Usage:");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run amplify/scripts/args.test.ts`
Expected: FAIL — `Failed to resolve import "./args"`.

- [ ] **Step 3: Implement argument parsing**

`amplify/scripts/args.ts`:

```ts
import { StaffError } from "../functions/staff-admin/staff";

const USAGE = "Usage: npm run admin:create -- <email> [--outputs <path>]";

export function parseAdminCreateArgs(argv: string[]): { email: string; outputsPath: string } {
  const positional: string[] = [];
  let outputsPath = "amplify_outputs.json";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--outputs") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new StaffError(USAGE);
      outputsPath = value;
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length !== 1) throw new StaffError(USAGE);
  return { email: positional[0], outputsPath };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run amplify/scripts/args.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the script and register it**

`amplify/scripts/admin-create.ts`:

```ts
import { readFileSync } from "node:fs";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { createOwner, StaffError } from "../functions/staff-admin/staff";
import { parseAdminCreateArgs } from "./args";

async function main() {
  const { email, outputsPath } = parseAdminCreateArgs(process.argv.slice(2));

  let outputs: { auth?: { user_pool_id?: string; aws_region?: string } };
  try {
    outputs = JSON.parse(readFileSync(outputsPath, "utf8"));
  } catch {
    throw new StaffError(
      `Can't read ${outputsPath}. Run "npx ampx sandbox" (local) or "npx ampx generate outputs" (deployed branch) first.`,
    );
  }
  const userPoolId = outputs.auth?.user_pool_id;
  if (!userPoolId) throw new StaffError(`${outputsPath} has no auth.user_pool_id.`);

  const client = new CognitoIdentityProviderClient({ region: outputs.auth?.aws_region });
  const result = await createOwner(client, userPoolId, email);

  console.log(
    result.invited
      ? `Owner account created for ${result.email}. Cognito has emailed a temporary password; sign in at /admin/login.`
      : `${result.email} already had an account and is now the owner.`,
  );
}

main().catch((err) => {
  console.error(err instanceof StaffError ? err.message : err);
  process.exit(1);
});
```

`package.json` — add to `"scripts"`:

```json
    "admin:create": "tsx amplify/scripts/admin-create.ts",
```

- [ ] **Step 6: Check the error paths without touching AWS**

```bash
npm run admin:create
npm run admin:create -- owner@example.com --outputs does-not-exist.json
```

Expected: the first prints `Usage: npm run admin:create -- <email> [--outputs <path>]`; the second prints `Can't read does-not-exist.json. …`. Both exit with code 1.

- [ ] **Step 7: Create the real owner in the sandbox (needs the owner's email)**

Ask the owner which email to use, then:

```bash
npm run admin:create -- <owner-email>
```

Expected: `Owner account created for <owner-email>. …`, and an email titled **Your Baba Saab Invitations staff account** arrives with a temporary password. Run the same command again. Expected: `<owner-email> already had an account and is now the owner.` if they have signed in, or a resent invitation if not.

- [ ] **Step 8: Commit**

```bash
git add amplify/scripts package.json
git commit -m "feat(backend): add admin:create script for the owner account"
```

---

### Task 4: Access rules, Amplify wiring and middleware

**Files:**
- Create: `src/AdminModule/auth/access.js`, `src/AdminModule/auth/access.test.js`, `src/AdminModule/auth/amplifyServer.js`, `src/AdminModule/auth/server.js`, `src/AdminModule/auth/ConfigureAmplify.jsx`, `src/middleware.js`
- Modify: `src/app/(admin)/layout.js`

**Interfaces:**
- Consumes: `amplify_outputs.json` (Task 1/2).
- Produces:
  - `access.js`: `STAFF_GROUP`, `OWNER_GROUP`, `LOGIN_PATH = "/admin/login"`, `groupsFromTokens(tokens) → string[]`, `sessionFromTokens(tokens) → { username, email, groups, isStaff, isOwner } | null`, `decideAdminAccess({ pathname, signedIn, groups }) → "allow" | "login" | "no-access" | "owner-only"`, `safeNextPath(next) → string`.
  - `amplifyServer.js`: `runWithAmplifyServerContext`, `outputs`.
  - `server.js`: `getStaffSession() → session | null`, `requireStaff() → session`, `requireOwner() → session` (they redirect when access is denied).
  - `ConfigureAmplify.jsx`: default export rendering `null`; configures Amplify in the browser with cookie storage.

- [ ] **Step 1: Write the failing access tests**

`src/AdminModule/auth/access.test.js`:

```js
import { describe, expect, it } from "vitest";
import { decideAdminAccess, groupsFromTokens, safeNextPath, sessionFromTokens } from "./access";

const tokens = (groups, extra = {}) => ({
  accessToken: { payload: { username: "u-1", ...(groups ? { "cognito:groups": groups } : {}) } },
  idToken: { payload: { email: "priya@example.com" } },
  ...extra,
});

describe("groupsFromTokens", () => {
  it("reads Cognito groups from the access token", () => {
    expect(groupsFromTokens(tokens(["admin", "owner"]))).toEqual(["admin", "owner"]);
  });

  it("returns no groups when there are none or no tokens", () => {
    expect(groupsFromTokens(tokens(undefined))).toEqual([]);
    expect(groupsFromTokens(null)).toEqual([]);
  });
});

describe("sessionFromTokens", () => {
  it("summarises who is signed in", () => {
    expect(sessionFromTokens(tokens(["admin"]))).toEqual({
      username: "u-1",
      email: "priya@example.com",
      groups: ["admin"],
      isStaff: true,
      isOwner: false,
    });
  });

  it("is null when signed out", () => {
    expect(sessionFromTokens(null)).toBeNull();
    expect(sessionFromTokens({})).toBeNull();
  });
});

describe("decideAdminAccess", () => {
  const staff = ["admin"];
  const owner = ["admin", "owner"];

  it("always lets people reach the login page", () => {
    expect(decideAdminAccess({ pathname: "/admin/login", signedIn: false, groups: [] })).toBe("allow");
    expect(decideAdminAccess({ pathname: "/admin/login", signedIn: true, groups: [] })).toBe("allow");
  });

  it("sends signed-out visitors to log in", () => {
    expect(decideAdminAccess({ pathname: "/admin", signedIn: false, groups: [] })).toBe("login");
    expect(decideAdminAccess({ pathname: "/admin/templates/royal", signedIn: false, groups: [] })).toBe("login");
  });

  it("refuses signed-in users who are not staff", () => {
    expect(decideAdminAccess({ pathname: "/admin", signedIn: true, groups: [] })).toBe("no-access");
  });

  it("lets staff into staff pages", () => {
    expect(decideAdminAccess({ pathname: "/admin", signedIn: true, groups: staff })).toBe("allow");
    expect(decideAdminAccess({ pathname: "/admin/help", signedIn: true, groups: staff })).toBe("allow");
  });

  it("keeps the staff page for the owner only", () => {
    expect(decideAdminAccess({ pathname: "/admin/staff", signedIn: true, groups: staff })).toBe("owner-only");
    expect(decideAdminAccess({ pathname: "/admin/staff/anything", signedIn: true, groups: staff })).toBe("owner-only");
    expect(decideAdminAccess({ pathname: "/admin/staff", signedIn: true, groups: owner })).toBe("allow");
  });

  it("doesn't treat lookalike paths as owner-only or as the login page", () => {
    expect(decideAdminAccess({ pathname: "/admin/staffing", signedIn: true, groups: staff })).toBe("allow");
    expect(decideAdminAccess({ pathname: "/admin/loginx", signedIn: false, groups: [] })).toBe("login");
  });
});

describe("safeNextPath", () => {
  it("keeps admin paths, with their query", () => {
    expect(safeNextPath("/admin/templates/royal?palette=ivory")).toBe("/admin/templates/royal?palette=ivory");
    expect(safeNextPath("/admin")).toBe("/admin");
  });

  it("falls back to the dashboard for anything off-site or odd", () => {
    for (const bad of [
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/admin\\evil",
      "/adminx",
      "/",
      "/admin/login",
      "/admin/login?next=/admin",
    ]) {
      expect(safeNextPath(bad)).toBe("/admin");
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/auth/access.test.js`
Expected: FAIL — `Failed to resolve import "./access"`.

- [ ] **Step 3: Implement the access rules**

`src/AdminModule/auth/access.js`:

```js
// Every rule about who may open which admin page lives here, so the middleware,
// server-side guards and tests all agree.

export const STAFF_GROUP = "admin";
export const OWNER_GROUP = "owner";
export const LOGIN_PATH = "/admin/login";
const HOME_PATH = "/admin";
const OWNER_ONLY_PATHS = ["/admin/staff"];

function isUnder(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Cognito puts a user's groups in the access token. */
export function groupsFromTokens(tokens) {
  const groups = tokens?.accessToken?.payload?.["cognito:groups"];
  return Array.isArray(groups) ? groups : [];
}

export function sessionFromTokens(tokens) {
  if (!tokens?.accessToken) return null;
  const groups = groupsFromTokens(tokens);
  return {
    username: tokens.accessToken.payload.username,
    email: tokens.idToken?.payload?.email ?? "",
    groups,
    isStaff: groups.includes(STAFF_GROUP),
    isOwner: groups.includes(OWNER_GROUP),
  };
}

/** @returns {"allow" | "login" | "no-access" | "owner-only"} */
export function decideAdminAccess({ pathname, signedIn, groups }) {
  if (isUnder(pathname, LOGIN_PATH)) return "allow";
  if (!signedIn) return "login";
  if (!groups.includes(STAFF_GROUP)) return "no-access";
  if (OWNER_ONLY_PATHS.some((p) => isUnder(pathname, p)) && !groups.includes(OWNER_GROUP)) return "owner-only";
  return "allow";
}

/** Where to go after signing in. Only admin paths on this site, so ?next= can't send anyone elsewhere. */
export function safeNextPath(next) {
  if (typeof next !== "string" || next.includes("\\") || next.startsWith("//")) return HOME_PATH;
  const pathname = next.split(/[?#]/)[0];
  if (!isUnder(pathname, HOME_PATH) || isUnder(pathname, LOGIN_PATH)) return HOME_PATH;
  return next;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/auth/access.test.js`
Expected: PASS (12 tests).

- [ ] **Step 5: Wire Amplify for the server and the browser**

`src/AdminModule/auth/amplifyServer.js`:

```js
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
// Generated by `npx ampx sandbox` locally and by the Amplify build for deployed branches.
import outputs from "../../../amplify_outputs.json";

export { outputs };
export const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });
```

`src/AdminModule/auth/server.js`:

```js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "./amplifyServer";
import { LOGIN_PATH, sessionFromTokens } from "./access";

/** Who is signed in, read from the auth cookies on this request, or null. */
export async function getStaffSession() {
  const tokens = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        return (await fetchAuthSession(contextSpec)).tokens ?? null;
      } catch {
        return null;
      }
    },
  });
  return sessionFromTokens(tokens);
}

/** Use in every staff layout, page and server action; the middleware alone is not enough. */
export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) redirect(LOGIN_PATH);
  if (!session.isStaff) redirect(`${LOGIN_PATH}?error=no-access`);
  return session;
}

export async function requireOwner() {
  const session = await requireStaff();
  if (!session.isOwner) redirect("/admin");
  return session;
}
```

`src/AdminModule/auth/ConfigureAmplify.jsx`:

```jsx
"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../../amplify_outputs.json";

// ssr: true keeps the sign-in tokens in cookies, so the middleware and server components can read them.
Amplify.configure(outputs, { ssr: true });

export default function ConfigureAmplify() {
  return null;
}
```

- [ ] **Step 6: Add the middleware**

`src/middleware.js`:

```js
import { NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/AdminModule/auth/amplifyServer";
import { decideAdminAccess, groupsFromTokens, LOGIN_PATH } from "@/AdminModule/auth/access";

export async function middleware(request) {
  const response = NextResponse.next();
  const tokens = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        // With a response in context, refreshed tokens are written back as cookies.
        return (await fetchAuthSession(contextSpec)).tokens ?? null;
      } catch {
        return null;
      }
    },
  });

  const { pathname, search } = request.nextUrl;
  const decision = decideAdminAccess({ pathname, signedIn: Boolean(tokens?.accessToken), groups: groupsFromTokens(tokens) });
  if (decision === "allow") return response;

  const url = request.nextUrl.clone();
  url.search = "";
  if (decision === "login") {
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname + search);
  } else if (decision === "no-access") {
    url.pathname = LOGIN_PATH;
    url.searchParams.set("error", "no-access");
  } else {
    url.pathname = "/admin";
  }
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
```

- [ ] **Step 7: Configure Amplify in the admin root layout**

`src/app/(admin)/layout.js` — replace the file. (The shell moves to the `(staff)` layout in Task 5; until then it stays here.)

```js
import "../globals.css";
import AdminShell from "@/AdminModule/AdminShell";
import ConfigureAmplify from "@/AdminModule/auth/ConfigureAmplify";

export const metadata = { title: "Baba Saab Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <ConfigureAmplify />
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Check the redirects on the dev server**

```bash
npm run dev
```

In a second terminal:

```bash
for p in /admin /admin/templates /admin/help /admin/staff; do printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000$p"; done
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/preview/template/royal
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: each `/admin…` path returns `307` to `http://localhost:3000/admin/login?next=%2Fadmin…`. The preview and home pages return `200`, so the middleware leaves the site and previews alone. Stop the server.

- [ ] **Step 9: Run all tests and commit**

```bash
npm test
git add src/AdminModule/auth src/middleware.js "src/app/(admin)/layout.js"
git commit -m "feat(admin): require staff sign-in for admin routes"
```

Expected: all tests pass before committing.

---

### Task 5: Sign-in page, protected layout, admin shell and dashboard

**Files:**
- Create: `src/app/(admin)/admin/login/page.js`, `src/AdminModule/auth/LoginPanel.jsx`, `src/AdminModule/auth/LoginPanel.test.jsx`, `src/AdminModule/auth/SignOutButton.jsx`, `src/app/(admin)/admin/(staff)/layout.js`, `src/AdminModule/GuideBanner.jsx`, `src/AdminModule/GuideBanner.test.jsx`, `src/AdminModule/AdminShell.test.jsx`
- Move: `src/app/(admin)/admin/page.js` → `src/app/(admin)/admin/(staff)/page.js` (then rewrite), `src/app/(admin)/admin/help/` → `src/app/(admin)/admin/(staff)/help/`, `src/app/(admin)/admin/templates/` → `src/app/(admin)/admin/(staff)/templates/`
- Modify: `src/app/(admin)/layout.js`, `src/AdminModule/AdminShell.jsx`, `src/app/(admin)/admin/(staff)/help/page.js`, `docs/admin-guide.md`

**Interfaces:**
- Consumes: `requireStaff`, `safeNextPath` and `LOGIN_PATH` from Task 4.
- Produces:
  - `AdminShell({ email, isOwner, children })`, plus `navFor({ isOwner }) → { href, label }[]`. The owner's menu includes Staff.
  - `GuideBanner({ storageKey })`
  - `LoginPanel({ next, error })` and `NoAccessNotice()`
  - `SignOutButton()`

- [ ] **Step 1: Move the existing pages into a protected route group**

```bash
mkdir -p "src/app/(admin)/admin/(staff)"
git mv "src/app/(admin)/admin/page.js" "src/app/(admin)/admin/(staff)/page.js"
git mv "src/app/(admin)/admin/help" "src/app/(admin)/admin/(staff)/help"
git mv "src/app/(admin)/admin/templates" "src/app/(admin)/admin/(staff)/templates"
```

`src/app/(admin)/admin/(staff)/help/page.js` — the folder is one level deeper, so change the guide import:

```js
import guide from "../../../../../../docs/admin-guide.md";
```

Route groups don't change URLs: these pages are still `/admin`, `/admin/help` and `/admin/templates`.

- [ ] **Step 2: Write the failing shell, banner and login tests**

`src/AdminModule/AdminShell.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn() }));

import AdminShell, { navFor } from "./AdminShell";

describe("navFor", () => {
  it("shows Staff to the owner only", () => {
    expect(navFor({ isOwner: true }).map((i) => i.label)).toEqual(["Dashboard", "Templates", "Staff", "Help"]);
    expect(navFor({ isOwner: false }).map((i) => i.label)).toEqual(["Dashboard", "Templates", "Help"]);
  });
});

describe("AdminShell", () => {
  it("shows who is signed in and a sign-out button", () => {
    render(
      <AdminShell email="priya@example.com" isOwner={false}>
        <p>page body</p>
      </AdminShell>,
    );
    expect(screen.getByText("priya@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Staff" })).not.toBeInTheDocument();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });
});
```

`src/AdminModule/GuideBanner.test.jsx`:

```jsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuideBanner from "./GuideBanner";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("GuideBanner", () => {
  it("links to the guide until dismissed, and stays dismissed", async () => {
    const { unmount } = render(<GuideBanner storageKey="guide:u-1" />);
    expect(await screen.findByRole("link", { name: /read the 5-minute guide/i })).toHaveAttribute("href", "/admin/help");

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
    unmount();

    render(<GuideBanner storageKey="guide:u-1" />);
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });

  it("is per staff member", async () => {
    localStorage.setItem("guide:u-1", "dismissed");
    render(<GuideBanner storageKey="guide:u-2" />);
    expect(await screen.findByRole("link", { name: /guide/i })).toBeInTheDocument();
  });

  it("still works when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<GuideBanner storageKey="guide:u-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });
});
```

`src/AdminModule/auth/LoginPanel.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@aws-amplify/ui-react", () => ({
  Authenticator: ({ hideSignUp }) => <div data-testid="authenticator" data-hide-sign-up={String(hideSignUp)} />,
}));

import LoginPanel from "./LoginPanel";

describe("LoginPanel", () => {
  it("shows the sign-in form without a sign-up option", () => {
    render(<LoginPanel next="/admin" />);
    expect(screen.getByTestId("authenticator")).toHaveAttribute("data-hide-sign-up", "true");
  });

  it("explains a missing staff role instead of showing the form", () => {
    render(<LoginPanel next="/admin" error="no-access" />);
    expect(screen.queryByTestId("authenticator")).not.toBeInTheDocument();
    expect(screen.getByText(/doesn't have access to the admin area/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/AdminShell.test.jsx src/AdminModule/GuideBanner.test.jsx src/AdminModule/auth/LoginPanel.test.jsx`
Expected: FAIL. `navFor` is not exported, and `./GuideBanner` and `./LoginPanel` can't be resolved.

- [ ] **Step 4: Implement the sign-out button and shell**

`src/AdminModule/auth/SignOutButton.jsx`:

```jsx
"use client";

import { useState } from "react";
import { signOut } from "aws-amplify/auth";

export default function SignOutButton({ className = "" }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await signOut();
    } finally {
      // A full page load clears any cached admin pages from the router.
      window.location.assign("/admin/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`min-h-[44px] rounded-md px-3 text-left text-sm hover:bg-stone-100 disabled:opacity-60 ${className}`}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
```

`src/AdminModule/AdminShell.jsx` — replace the file:

```jsx
import Link from "next/link";
import SignOutButton from "./auth/SignOutButton";

export function navFor({ isOwner }) {
  return [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/templates", label: "Templates" },
    ...(isOwner ? [{ href: "/admin/staff", label: "Staff" }] : []),
    { href: "/admin/help", label: "Help" },
  ];
}

export default function AdminShell({ email, isOwner, children }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200 bg-white md:flex md:w-56 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="px-5 py-4 font-semibold">Baba Saab · Invitations</div>
        <nav className="flex flex-wrap gap-1 px-3 pb-3 md:flex-col" aria-label="Admin">
          {navFor({ isOwner }).map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-[44px] items-center rounded-md px-3 text-sm hover:bg-stone-100">
              {item.label}
            </Link>
          ))}
          <span className="flex min-h-[44px] items-center rounded-md px-3 text-sm text-stone-400">Invitations · coming soon</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-3 py-3 md:mt-auto md:flex-col md:items-stretch">
          <p className="truncate px-3 text-xs text-stone-500" title={email}>{email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Implement the guide banner**

`src/AdminModule/GuideBanner.jsx`:

```jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function readDismissed(key) {
  try {
    return localStorage.getItem(key) === "dismissed";
  } catch {
    return false;
  }
}

/** "New here?" prompt shown on the dashboard until this staff member dismisses it on this device. */
export default function GuideBanner({ storageKey }) {
  // Hidden until mounted, so people who dismissed it never see it flash.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readDismissed(storageKey));
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // Storage blocked: the banner just returns next visit.
    }
  }

  if (!visible) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="flex-1 text-sm">
        New here?{" "}
        <Link href="/admin/help" className="font-medium underline">
          Read the 5-minute guide
        </Link>
      </p>
      <button type="button" onClick={dismiss} className="min-h-[44px] rounded-md px-3 text-sm hover:bg-amber-100">
        Dismiss
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Implement the login panel**

`src/AdminModule/auth/LoginPanel.jsx`:

```jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import SignOutButton from "./SignOutButton";

function GoTo({ href }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
    router.refresh();
  }, [href, router]);
  return <p className="text-center text-sm text-stone-600">Signing you in…</p>;
}

export function NoAccessNotice() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
      <h2 className="text-lg font-semibold">No access</h2>
      <p className="mt-2 text-sm text-stone-600">
        This account doesn&apos;t have access to the admin area. Ask the owner to invite you from the Staff page, then sign in with
        the email they used.
      </p>
      <div className="mt-4 flex justify-center">
        <SignOutButton className="border border-stone-300" />
      </div>
    </div>
  );
}

/**
 * Amplify's Authenticator handles sign-in, the first-login "choose a new password" step and
 * "Forgot your password?". Sign-up is hidden; accounts come from the owner.
 */
export default function LoginPanel({ next, error }) {
  if (error === "no-access") return <NoAccessNotice />;
  return <Authenticator hideSignUp>{() => <GoTo href={next} />}</Authenticator>;
}
```

- [ ] **Step 7: Run the component tests to verify they pass**

Run: `npx vitest run src/AdminModule/AdminShell.test.jsx src/AdminModule/GuideBanner.test.jsx src/AdminModule/auth/LoginPanel.test.jsx`
Expected: PASS (7 tests).

- [ ] **Step 8: Add the login page, protected layout and dashboard**

`src/app/(admin)/layout.js` — replace the file (the shell moves into the protected group):

```js
import "../globals.css";
import ConfigureAmplify from "@/AdminModule/auth/ConfigureAmplify";

export const metadata = { title: "Baba Saab Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900">
        <ConfigureAmplify />
        {children}
      </body>
    </html>
  );
}
```

`src/app/(admin)/admin/(staff)/layout.js`:

```js
import AdminShell from "@/AdminModule/AdminShell";
import { requireStaff } from "@/AdminModule/auth/server";

export default async function StaffLayout({ children }) {
  const session = await requireStaff();
  return (
    <AdminShell email={session.email} isOwner={session.isOwner}>
      {children}
    </AdminShell>
  );
}
```

`src/app/(admin)/admin/login/page.js`:

```js
import LoginPanel from "@/AdminModule/auth/LoginPanel";
import { safeNextPath } from "@/AdminModule/auth/access";

export const metadata = { title: "Sign in · Baba Saab Admin" };

export default function LoginPage({ searchParams }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-stone-500">Baba Saab Events</p>
        <h1 className="mt-1 text-2xl font-semibold">Invitations · Staff sign in</h1>
      </div>
      <div className="w-full max-w-md">
        <LoginPanel next={safeNextPath(searchParams?.next)} error={searchParams?.error} />
      </div>
    </main>
  );
}
```

`src/app/(admin)/admin/(staff)/page.js` — replace the file:

```js
import Link from "next/link";
import GuideBanner from "@/AdminModule/GuideBanner";
import { requireStaff } from "@/AdminModule/auth/server";

export const metadata = { title: "Dashboard · Baba Saab Admin" };

export default async function Dashboard() {
  const session = await requireStaff();
  const cards = [
    { href: "/admin/templates", title: "Templates", text: "Browse the 4 designs and show them to customers." },
    ...(session.isOwner ? [{ href: "/admin/staff", title: "Staff", text: "Invite or remove people who can sign in here." }] : []),
    { href: "/admin/help", title: "Help", text: "The staff guide: how everything here works." },
  ];

  return (
    <div className="max-w-4xl">
      <GuideBanner storageKey={`guide-banner-dismissed:${session.username}`} />
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="mt-1 text-stone-600">Signed in as {session.email}.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400">
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{card.text}</p>
          </Link>
        ))}
      </div>
      <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
        Coming soon: your invitations, upcoming events, recent RSVPs and invitations due for deletion will appear here.
      </p>
    </div>
  );
}
```

- [ ] **Step 9: Update the staff guide**

`docs/admin-guide.md` — replace the "What you can do right now" table with:

```markdown
| Area | What it's for |
|---|---|
| **Dashboard** | Your starting page after signing in. |
| **Templates** | Browse the 4 invitation designs with sample details, try their colour palettes and languages, and show them to customers. |
| **Staff** | *Owner only.* Invite people to the admin area and remove them. |
| **Help** | This guide. |
```

Then insert these sections directly after that table's closing paragraph (before `## Browsing templates`):

```markdown
## Signing in

The admin area is private. Everyone who uses it has their own account, which the owner creates.

**Your first sign-in**

1. Look for an email titled **Your Baba Saab Invitations staff account**. Check your spam folder if it isn't in your inbox.
2. Open the sign-in link in the email.
3. Enter your email address and the **temporary password** from the email, then click **Sign in**.
4. Choose your own password and enter it twice. It needs at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.

The temporary password works for 7 days. If it has expired, ask the owner to send your invitation again.

**Forgot your password?** On the sign-in page click **Forgot your password?**, enter your email, and type in the code you're emailed along with a new password.

**Signing out.** Click **Sign out** at the bottom of the left menu. Always sign out on a shared computer.

**"No access" message.** Your account isn't set up as staff. Ask the owner to invite you, then sign in with the email address they used.

## The dashboard

After signing in you land on the **Dashboard**. It links to everything you can use. Your invitations, upcoming events and recent RSVPs will appear here as those features arrive.

The yellow **New here?** banner links to this guide. Click **Dismiss** to hide it on this computer.
```

- [ ] **Step 10: Run all tests and build**

```bash
npm test
npx next build
```

Expected: all tests pass; the build lists `/admin`, `/admin/help`, `/admin/login`, `/admin/templates`, `/admin/templates/[templateId]` and the `Middleware` entry.

- [ ] **Step 11: Try the sign-in flow in the browser**

With `npm run dev` running and the owner's invitation email from Task 3 in hand:

- [ ] `http://localhost:3000/admin/templates` redirects to the sign-in page. It has no "Create Account" tab.
- [ ] Signing in with the temporary password asks for a new password, then lands on `/admin/templates` (the `next` page).
- [ ] The dashboard shows the email, the Templates/Staff/Help cards and the guide banner. Dismiss hides it, and it stays hidden after reload.
- [ ] **Sign out** returns to the sign-in page; `/admin` then redirects to sign-in again.
- [ ] **Forgot your password?** emails a code, and the new password works.
- [ ] `http://localhost:3000/admin/login?next=https://example.com` signs in to `/admin`, not example.com.

- [ ] **Step 12: Commit**

```bash
git add -A "src/app/(admin)" src/AdminModule docs/admin-guide.md
git commit -m "feat(admin): add staff sign-in page, protected shell and dashboard"
```

---

### Task 6: Owner-only staff page

**Files:**
- Create: `src/AdminModule/staff/format.js`, `src/AdminModule/staff/format.test.js`, `src/AdminModule/staff/dataClient.js`, `src/AdminModule/staff/actions.js`, `src/AdminModule/staff/InviteStaffForm.jsx`, `src/AdminModule/staff/InviteStaffForm.test.jsx`, `src/AdminModule/staff/StaffList.jsx`, `src/AdminModule/staff/StaffList.test.jsx`, `src/app/(admin)/admin/(staff)/staff/page.js`
- Modify: `docs/admin-guide.md`

**Interfaces:**
- Consumes: `requireOwner` (Task 4); `outputs` (Task 4); Data operations `listStaff`, `inviteStaff`, `removeStaff` (Task 2), whose members have the `StaffMember` shape `{ username, email, name, status, isOwner, createdAt }`.
- Produces:
  - `format.js`: `statusLabel(status) → string`, `formatAddedDate(iso) → string` (e.g. `"1 Oct 2026"`, IST), `errorMessage(errors) → string`, `OFFLINE_MESSAGE`.
  - `actions.js` (server actions): `inviteStaffAction({ email, name }) → { ok, message }`, `removeStaffAction({ username }) → { ok, message }`.
  - `InviteStaffForm({ inviteAction })`, `StaffList({ members, currentUsername, inviteAction, removeAction })`.

- [ ] **Step 1: Write the failing format tests**

`src/AdminModule/staff/format.test.js`:

```js
import { describe, expect, it } from "vitest";
import { errorMessage, formatAddedDate, statusLabel } from "./format";

describe("statusLabel", () => {
  it("describes each account status in plain words", () => {
    expect(statusLabel("invited")).toBe("Invited · hasn't signed in yet");
    expect(statusLabel("active")).toBe("Active");
    expect(statusLabel("disabled")).toBe("Disabled");
  });
});

describe("formatAddedDate", () => {
  it("shows the day in India time", () => {
    expect(formatAddedDate("2026-10-01T10:00:00.000Z")).toBe("1 Oct 2026");
    // 20:00 UTC on 1 Oct is already 2 Oct in India.
    expect(formatAddedDate("2026-10-01T20:00:00.000Z")).toBe("2 Oct 2026");
  });
});

describe("errorMessage", () => {
  it("uses the message the backend wrote for staff", () => {
    expect(errorMessage([{ message: "neha@example.com already has a staff account.", errorType: "Lambda:Unhandled" }])).toBe(
      "neha@example.com already has a staff account.",
    );
  });

  it("explains authorisation failures", () => {
    expect(errorMessage([{ message: "Not Authorized to access listStaff on type Query", errorType: "Unauthorized" }])).toBe(
      "Only the owner can manage staff.",
    );
  });

  it("falls back to a generic message", () => {
    expect(errorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(errorMessage([{}])).toBe("Something went wrong. Please try again.");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/staff/format.test.js`
Expected: FAIL — `Failed to resolve import "./format"`.

- [ ] **Step 3: Implement the formatting helpers**

`src/AdminModule/staff/format.js`:

```js
const GENERIC = "Something went wrong. Please try again.";
export const OFFLINE_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

const STATUS_LABELS = {
  invited: "Invited · hasn't signed in yet",
  active: "Active",
  disabled: "Disabled",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

const addedDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatAddedDate(iso) {
  return addedDate.format(new Date(iso));
}

/** Turns Amplify Data `errors` into one sentence for staff. */
export function errorMessage(errors) {
  const first = errors?.[0];
  if (!first) return GENERIC;
  if (first.errorType === "Unauthorized") return "Only the owner can manage staff.";
  return first.message || GENERIC;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/AdminModule/staff/format.test.js`
Expected: PASS (5 tests). If `formatAddedDate` returns `"1 Oct, 2026"` on this Node's ICU data, change the expected strings and the guide wording to match what Node prints, keeping the IST day boundary assertion.

- [ ] **Step 5: Write the failing component tests**

`src/AdminModule/staff/InviteStaffForm.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteStaffForm from "./InviteStaffForm";

async function fillAndSend(name, email) {
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));
}

describe("InviteStaffForm", () => {
  it("sends the name and email, shows the result and clears the form", async () => {
    const inviteAction = vi.fn(async () => ({ ok: true, message: "Invitation emailed to neha@example.com." }));
    render(<InviteStaffForm inviteAction={inviteAction} />);

    await fillAndSend("Neha", "neha@example.com");

    expect(inviteAction).toHaveBeenCalledWith({ email: "neha@example.com", name: "Neha" });
    expect(await screen.findByRole("status")).toHaveTextContent("Invitation emailed to neha@example.com.");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("keeps what was typed when the invite fails", async () => {
    const inviteAction = vi.fn(async () => ({ ok: false, message: "neha@example.com already has a staff account." }));
    render(<InviteStaffForm inviteAction={inviteAction} />);

    await fillAndSend("Neha", "neha@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("already has a staff account");
    expect(screen.getByLabelText("Email")).toHaveValue("neha@example.com");
  });

  it("explains a lost connection", async () => {
    const inviteAction = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<InviteStaffForm inviteAction={inviteAction} />);

    await fillAndSend("Neha", "neha@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server");
  });
});
```

`src/AdminModule/staff/StaffList.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffList from "./StaffList";

const members = [
  { username: "u-owner", email: "owner@example.com", name: "Ravi", status: "active", isOwner: true, createdAt: "2026-10-01T10:00:00.000Z" },
  { username: "u-amit", email: "amit@example.com", name: null, status: "invited", isOwner: false, createdAt: "2026-10-02T10:00:00.000Z" },
  { username: "u-zara", email: "zara@example.com", name: "Zara", status: "active", isOwner: false, createdAt: null },
];

function setup(overrides = {}) {
  const props = {
    members,
    currentUsername: "u-owner",
    inviteAction: vi.fn(async () => ({ ok: true, message: "Invitation emailed to amit@example.com." })),
    removeAction: vi.fn(async () => ({ ok: true, message: "Removed. They can no longer sign in." })),
    ...overrides,
  };
  render(<StaffList {...props} />);
  return props;
}

const row = (text) => screen.getByText(text).closest("li");

describe("StaffList", () => {
  it("shows each person with their status, and marks the owner and you", () => {
    setup();
    expect(within(row("Ravi (you)")).getByText("Owner")).toBeInTheDocument();
    expect(within(row("amit@example.com")).getByText("Invited · hasn't signed in yet")).toBeInTheDocument();
    expect(within(row("Zara")).getByText("Active")).toBeInTheDocument();
    expect(within(row("Zara")).getByText("zara@example.com")).toBeInTheDocument();
  });

  it("never offers to remove the owner or yourself", () => {
    setup();
    expect(within(row("Ravi (you)")).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(within(row("Zara")).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("resends a pending invitation", async () => {
    const { inviteAction } = setup();
    await userEvent.click(within(row("amit@example.com")).getByRole("button", { name: "Send invite again" }));
    expect(inviteAction).toHaveBeenCalledWith({ email: "amit@example.com", name: null });
    expect(await screen.findByRole("status")).toHaveTextContent("Invitation emailed to amit@example.com.");
    expect(within(row("Zara")).queryByRole("button", { name: "Send invite again" })).not.toBeInTheDocument();
  });

  it("asks before removing, and can be cancelled", async () => {
    const { removeAction } = setup();
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Remove" }));
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Cancel" }));
    expect(removeAction).not.toHaveBeenCalled();

    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Remove" }));
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Yes, remove" }));
    expect(removeAction).toHaveBeenCalledWith({ username: "u-zara" });
    expect(await screen.findByRole("status")).toHaveTextContent("Removed.");
  });

  it("shows a failed removal as an alert", async () => {
    setup({ removeAction: vi.fn(async () => ({ ok: false, message: "The owner account can't be removed." })) });
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Remove" }));
    await userEvent.click(within(row("Zara")).getByRole("button", { name: "Yes, remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The owner account can't be removed.");
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/AdminModule/staff`
Expected: FAIL — `./InviteStaffForm` and `./StaffList` can't be resolved.

- [ ] **Step 7: Implement the invite form**

`src/AdminModule/staff/InviteStaffForm.jsx`:

```jsx
"use client";

import { useState } from "react";
import { OFFLINE_MESSAGE } from "./format";

const inputClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 px-3 text-sm";

export default function InviteStaffForm({ inviteAction }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const outcome = await inviteAction({
        email: String(data.get("email") ?? "").trim(),
        name: String(data.get("name") ?? "").trim(),
      });
      setResult(outcome);
      if (outcome.ok) form.reset();
    } catch {
      setResult({ ok: false, message: OFFLINE_MESSAGE });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm">
        Name
        <input name="name" required autoComplete="off" className={inputClass} />
      </label>
      <label className="text-sm">
        Email
        <input name="email" type="email" required autoComplete="off" className={inputClass} />
      </label>
      <button type="submit" disabled={busy} className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-60">
        {busy ? "Sending…" : "Send invitation"}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-sm sm:col-span-3 ${result.ok ? "text-green-700" : "text-red-700"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 8: Implement the staff list**

`src/AdminModule/staff/StaffList.jsx`:

```jsx
"use client";

import { useState } from "react";
import { formatAddedDate, OFFLINE_MESSAGE, statusLabel } from "./format";

const buttonClass = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-60";

function StaffRow({ member, isYou, inviteAction, removeAction, onResult }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = member.name || member.email;

  async function run(action) {
    setBusy(true);
    try {
      onResult(await action());
    } catch {
      onResult({ ok: false, message: OFFLINE_MESSAGE });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {label}
          {isYou && " (you)"}
        </p>
        {member.name && <p className="text-sm text-stone-600">{member.email}</p>}
        <p className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
          {member.isOwner && <span className="rounded-full bg-stone-900 px-2 text-white">Owner</span>}
          <span>{statusLabel(member.status)}</span>
          {member.createdAt && <span>Added {formatAddedDate(member.createdAt)}</span>}
        </p>
      </div>

      {member.status === "invited" && (
        <button type="button" disabled={busy} className={buttonClass} onClick={() => run(() => inviteAction({ email: member.email, name: member.name }))}>
          Send invite again
        </button>
      )}

      {!member.isOwner && !isYou &&
        (confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Remove {label}? They will no longer be able to sign in.</span>
            <button
              type="button"
              disabled={busy}
              className="min-h-[44px] rounded-full bg-red-700 px-4 text-sm text-white disabled:opacity-60"
              onClick={() => run(() => removeAction({ username: member.username }))}
            >
              Yes, remove
            </button>
            <button type="button" disabled={busy} className={buttonClass} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className={buttonClass} onClick={() => setConfirming(true)}>
            Remove
          </button>
        ))}
    </li>
  );
}

export default function StaffList({ members, currentUsername, inviteAction, removeAction }) {
  const [notice, setNotice] = useState(null);

  return (
    <div>
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`mt-3 text-sm ${notice.ok ? "text-green-700" : "text-red-700"}`}>
          {notice.message}
        </p>
      )}
      <ul className="divide-y divide-stone-200">
        {members.map((member) => (
          <StaffRow
            key={member.username}
            member={member}
            isYou={member.username === currentUsername}
            inviteAction={inviteAction}
            removeAction={removeAction}
            onResult={setNotice}
          />
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 9: Run the component tests to verify they pass**

Run: `npx vitest run src/AdminModule/staff`
Expected: PASS (all three files).

- [ ] **Step 10: Add the server data client, actions and page**

`src/AdminModule/staff/dataClient.js`:

```js
import { cookies } from "next/headers";
import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data";
import { outputs } from "@/AdminModule/auth/amplifyServer";

/** Amplify Data client acting as the signed-in staff member (their cookies), for server code only. */
export function cookieDataClient() {
  return generateServerClientUsingCookies({ config: outputs, cookies });
}
```

`src/AdminModule/staff/actions.js`:

```js
"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/AdminModule/auth/server";
import { cookieDataClient } from "./dataClient";
import { errorMessage } from "./format";

export async function inviteStaffAction({ email, name }) {
  await requireOwner();
  if (!email?.trim()) return { ok: false, message: "Enter the staff member's email address." };

  const { data, errors } = await cookieDataClient().mutations.inviteStaff({ email: email.trim(), name: name?.trim() || null });
  if (errors?.length || !data) return { ok: false, message: errorMessage(errors) };

  revalidatePath("/admin/staff");
  return {
    ok: true,
    message: `Invitation emailed to ${data.email}. It contains a temporary password that works for 7 days.`,
  };
}

export async function removeStaffAction({ username }) {
  await requireOwner();

  const { data, errors } = await cookieDataClient().mutations.removeStaff({ username });
  if (errors?.length || !data) return { ok: false, message: errorMessage(errors) };

  revalidatePath("/admin/staff");
  return { ok: true, message: "Removed. They can no longer sign in, and any open session ends within the hour." };
}
```

`src/app/(admin)/admin/(staff)/staff/page.js`:

```js
import { requireOwner } from "@/AdminModule/auth/server";
import { cookieDataClient } from "@/AdminModule/staff/dataClient";
import { inviteStaffAction, removeStaffAction } from "@/AdminModule/staff/actions";
import { errorMessage } from "@/AdminModule/staff/format";
import InviteStaffForm from "@/AdminModule/staff/InviteStaffForm";
import StaffList from "@/AdminModule/staff/StaffList";

export const metadata = { title: "Staff · Baba Saab Admin" };

export default async function StaffPage() {
  const session = await requireOwner();
  const { data, errors } = await cookieDataClient().queries.listStaff();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Staff</h1>
      <p className="mt-1 text-stone-600">People who can sign in to this admin area. Only you, the owner, can see this page.</p>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Invite a staff member</h2>
        <p className="mt-1 text-sm text-stone-600">They&apos;ll get an email with a link and a temporary password.</p>
        <InviteStaffForm inviteAction={inviteStaffAction} />
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Current staff</h2>
        {errors?.length ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Couldn&apos;t load the staff list. {errorMessage(errors)} Refresh the page to try again.
          </p>
        ) : (
          <StaffList
            members={(data ?? []).filter(Boolean)}
            currentUsername={session.username}
            inviteAction={inviteStaffAction}
            removeAction={removeStaffAction}
          />
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 11: Update the staff guide**

`docs/admin-guide.md` — insert after the `## The dashboard` section:

```markdown
## Managing staff (owner only)

Only the owner sees **Staff** in the left menu.

**Inviting someone**

1. Open **Staff**.
2. Under **Invite a staff member**, enter their name and email address, then click **Send invitation**.
3. They receive an email with a sign-in link and a temporary password. Their row shows **Invited · hasn't signed in yet** until they sign in for the first time.

**They didn't get the email, or it expired?** Ask them to check spam first. Then click **Send invite again** on their row. This sends a fresh temporary password, valid for another 7 days.

**Removing someone**

1. Click **Remove** on their row.
2. Click **Yes, remove** to confirm.

They can't sign in again. If they're signed in at that moment, their session ends within the hour. You can't remove yourself or the owner account.
```

- [ ] **Step 12: Run all tests and build**

```bash
npm test
npx next build
```

Expected: all tests pass; the route table now includes `/admin/staff`.

- [ ] **Step 13: Try the staff flow in the browser**

With `npm run dev` running, signed in as the owner from Task 3:

- [ ] `/admin/staff` lists the owner (with the **Owner** badge and "(you)") and has no Remove button on that row.
- [ ] Invite a second email you can read (a `+staff` alias works, e.g. `you+staff1@gmail.com`). It appears as **Invited**, and the email arrives with the localhost sign-in link.
- [ ] Inviting the same email again shows the success message (a resend), not an error.
- [ ] In a private window, sign in as that staff member and set their password. The menu has no **Staff** item, and typing `/admin/staff` lands on `/admin`.
- [ ] Back as the owner, the staff member now shows **Active**. Inviting their email now shows "… already has a staff account."
- [ ] **Remove** → **Cancel** keeps them; **Remove** → **Yes, remove** removes them. In the private window, signing in again fails.

- [ ] **Step 14: Commit**

```bash
git add src/AdminModule/staff "src/app/(admin)/admin/(staff)/staff" docs/admin-guide.md
git commit -m "feat(admin): add owner-only staff page to invite and remove staff"
```

---

### Task 7: Hosting build, developer docs and final verification

**Files:**
- Create: `amplify.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a build spec Amplify Hosting uses to deploy the backend and the site together; developer setup docs; a verified branch ready for the owner to push.

- [ ] **Step 1: Capture the current console build settings (manual)**

Ask the owner to open **Amplify console → the app → Hosting → Build settings** and paste the current build spec. A committed `amplify.yml` overrides the console settings, so it must keep any custom commands or environment setup from there. Also note the app's **Node.js version** (Build settings → Build image settings).

- [ ] **Step 2: Write `amplify.yml`**

Start from the pasted console spec, keep its custom commands, and make sure it has this backend phase and these frontend build commands:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - "**/*"
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

`pipeline-deploy` deploys this branch's backend and writes `amplify_outputs.json` before `npm run build` runs, so the build can import it.

- [ ] **Step 3: Replace the README's boilerplate with developer setup**

`README.md` — replace the whole file:

````markdown
# Baba Saab Events

The Baba Saab Events website (Next.js 14, App Router) plus the staff-only Digital Invitations admin at `/admin`.

## Local development

Requirements: Node 20+, AWS credentials for the Baba Saab AWS account (IAM user with the `AmplifyBackendDeployFullAccess` policy).

```bash
npm install
npx ampx sandbox        # deploys your personal backend and writes amplify_outputs.json; leave it running
npm run dev             # in a second terminal: http://localhost:3000
```

`amplify_outputs.json` is generated and git-ignored. The app won't build without it, so run the sandbox first. Use `npx ampx sandbox --once` to deploy without watching for changes, and `npx ampx sandbox delete` to remove your sandbox.

### Staff accounts

Create the owner account in your sandbox (Cognito emails a temporary password):

```bash
npm run admin:create -- owner@example.com
```

Once signed in, the owner invites and removes other staff at `/admin/staff`.

### Tests

```bash
npm test
```

## Backend (Amplify Gen 2)

The backend is defined in TypeScript in `amplify/`:

| Path | What it defines |
|---|---|
| `amplify/auth/resource.ts` | Cognito user pool: email sign-in, `owner` and `admin` groups, the staff invitation email |
| `amplify/data/resource.ts` | Amplify Data API (owner-only staff operations; invitation models arrive later) |
| `amplify/functions/staff-admin/` | Lambda behind the staff operations; the rules live in `staff.ts` |
| `amplify/backend.ts` | Wires everything together; turns off self sign-up |

## Deploying

Amplify Hosting builds each connected branch with `amplify.yml`: it deploys that branch's backend (`ampx pipeline-deploy`), then builds the site. One-time setup per Amplify app:

1. **App settings → IAM roles → service role**: attach `AmplifyBackendDeployFullAccess`.
2. **Hosting → Environment variables**: set `ADMIN_SITE_URL` to the branch's public URL (e.g. `https://www.example.com`), so the staff invitation email links to the right sign-in page.

After a branch's first deploy, create its owner account:

```bash
npx ampx generate outputs --app-id <app-id> --branch <branch> --out-dir .amplify/<branch>
npm run admin:create -- owner@example.com --outputs .amplify/<branch>/amplify_outputs.json
```
````

- [ ] **Step 4: Full test run**

Run: `npm test`
Expected: every test file passes, both `src/**` and `amplify/**`; 0 failures.

- [ ] **Step 5: Production build and smoke test**

```bash
rm -rf .next && npx next build && npx next start -p 3005
```

In a second terminal:

```bash
for p in / /about /gallery /preview/template/royal /admin /admin/staff /admin/login; do printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3005$p"; done
```

Expected: `/`, `/about`, `/gallery` and `/preview/template/royal` return `200`. `/admin` and `/admin/staff` return `307` to `/admin/login?next=…`. `/admin/login` returns `200`. Stop the server.

- [ ] **Step 6: Mobile check of the sign-in and staff pages**

In Chrome DevTools device mode (iPhone 12 Pro and a 360px-wide Android), with `npm run dev`:
- [ ] The sign-in form fits without sideways scrolling, and the fields and buttons are easy to tap.
- [ ] The admin menu wraps above the page; **Sign out** is reachable.
- [ ] The staff list rows and the "Yes, remove" confirmation wrap cleanly.
- [ ] The console shows no errors or React warnings.

- [ ] **Step 7: Confirm the guide matches what was built**

Open `/admin/help` and follow the **Signing in**, **The dashboard** and **Managing staff** sections step by step against the running app. Every button name in the guide must match the screen exactly (for example **Send invitation**, **Send invite again**, **Yes, remove**, **Forgot your password?**). Fix the guide where it differs.

- [ ] **Step 8: Commit and hand off**

```bash
git add amplify.yml README.md docs/admin-guide.md
git commit -m "chore(hosting): add Amplify build spec and backend setup docs"
git log --oneline main..feature/invitations
```

Report to the owner:
- Phase 0 is complete on `feature/invitations`. With `/admin` now behind sign-in, the "don't merge before Phase 0" restriction from Phase 1 is lifted.
- Before this goes to `main`, they need to do the two console steps in README → Deploying (the service role policy and `ADMIN_SITE_URL`), and confirm `amplify.yml` matches their old console build settings.
- After the first production deploy, run `admin:create` against production (README → Deploying).

Ask before pushing; don't merge or cherry-pick to `main` yourself.
