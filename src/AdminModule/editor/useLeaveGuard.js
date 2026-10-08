"use client";

import { useCallback, useEffect, useRef } from "react";

export const LEAVE_MESSAGE = "You have unsaved changes. Leave this page anyway?";

/** While `active`, asks before closing the tab or following a link to another page. */
export function useLeaveGuard(active) {
  const allowed = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    allowed.current = false;

    const onBeforeUnload = (event) => {
      if (allowed.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event) => {
      if (allowed.current || event.defaultPrevented) return;
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
      if (window.confirm(LEAVE_MESSAGE)) allowed.current = true;
      else event.preventDefault();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("admin:before-signout", onSignOut);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("admin:before-signout", onSignOut);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);

  // For deliberate exits such as "Reload": stops the guard immediately, before React re-renders.
  return useCallback(() => {
    allowed.current = true;
  }, []);
}
