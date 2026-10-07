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
