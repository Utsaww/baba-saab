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
