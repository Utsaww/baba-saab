import { cookies } from "next/headers";
import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data";
import { outputs } from "@/AdminModule/auth/amplifyServer";

/** Amplify Data client acting as the signed-in staff member (their cookies), for server code only. */
export function cookieDataClient() {
  return generateServerClientUsingCookies({ config: outputs, cookies });
}
