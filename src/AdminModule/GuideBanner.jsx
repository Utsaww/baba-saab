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
