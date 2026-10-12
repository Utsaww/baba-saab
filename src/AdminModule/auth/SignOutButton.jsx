"use client";

import { useState } from "react";
import { signOut } from "aws-amplify/auth";

export default function SignOutButton({ className = "" }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    // Lets the editor save or ask about unsaved changes first; cancelling keeps the user signed in.
    const pending = [];
    const detail = { waitFor: (promise) => pending.push(promise) };
    const proceed = window.dispatchEvent(new CustomEvent("admin:before-signout", { cancelable: true, detail }));
    if (!proceed) return;
    setBusy(true);
    try {
      await Promise.allSettled(pending);
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
