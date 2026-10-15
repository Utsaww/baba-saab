"use client";

import NotAvailable from "@/InvitationModule/public/NotAvailable";

export default function InvitationError({ reset }) {
  return (
    <div>
      <NotAvailable title="Couldn't load this invitation — please try again in a minute" />
      <div className="-mt-24 flex justify-center">
        <button type="button" onClick={reset} className="min-h-[44px] rounded-full border border-stone-400 px-5 text-sm">
          Try again
        </button>
      </div>
    </div>
  );
}
