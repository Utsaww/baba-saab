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
