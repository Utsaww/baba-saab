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
