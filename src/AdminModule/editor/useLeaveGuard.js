"use client";

import { useCallback, useEffect, useRef } from "react";

export const LEAVE_MESSAGE = "Your latest changes couldn't be saved and will be lost. Leave this page anyway?";

/**
 * Guards the ways of leaving the editor:
 * - `warnOnClose`: any unsaved change. Closing or reloading the tab can't wait for a save, so the browser warns.
 * - `atRisk`: changes that won't be saved automatically (failed, conflict, or queued behind a save). Links and sign-out ask first.
 * - `flushNow`: saves what is pending. Sign-out waits for it; link clicks don't need to because unmounting saves.
 */
export function useLeaveGuard({ warnOnClose, atRisk, flushNow }) {
  const allowed = useRef(false);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (allowed.current || !warnOnClose) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event) => {
      if (allowed.current || !atRisk || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onSignOut = (event) => {
      if (allowed.current) return;
      if (atRisk) {
        if (window.confirm(LEAVE_MESSAGE)) allowed.current = true;
        else event.preventDefault();
      } else if (warnOnClose) {
        event.detail?.waitFor?.(
          Promise.resolve(flushNow()).then((result) => {
            // Saved: the final navigation must not trigger the browser's own prompt.
            if (result?.ok) allowed.current = true;
          }),
        );
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("admin:before-signout", onSignOut);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("admin:before-signout", onSignOut);
      document.removeEventListener("click", onClick, true);
    };
  }, [warnOnClose, atRisk, flushNow]);

  // For deliberate exits such as "Reload": stops the guard immediately, before React re-renders.
  return useCallback(() => {
    allowed.current = true;
  }, []);
}
