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
