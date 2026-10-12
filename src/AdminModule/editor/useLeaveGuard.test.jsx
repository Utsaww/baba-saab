import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useLeaveGuard } from "./useLeaveGuard";

function Page({ warnOnClose = false, atRisk = false, flushNow = () => Promise.resolve() }) {
  useLeaveGuard({ warnOnClose, atRisk, flushNow });
  return (
    <>
      <a href="/admin/invitations">All invitations</a>
      <a href="/admin/help#x" target="_blank" rel="noreferrer">Help</a>
    </>
  );
}

/**
 * Clicks a link and reports whether the click got past the guard to the page. The helper then
 * cancels the click itself, because jsdom can't navigate and would log an error.
 */
function click(link) {
  let reachedPage = false;
  const onPage = (event) => {
    reachedPage = !event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", onPage);
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  document.removeEventListener("click", onPage);
  return reachedPage;
}

afterEach(() => vi.restoreAllMocks());

describe("useLeaveGuard", () => {
  it("asks before following a link while changes are at risk", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Page warnOnClose atRisk />);
    expect(click(screen.getByText("All invitations"))).toBe(false);
    expect(confirm).toHaveBeenCalledWith("Your latest changes couldn't be saved and will be lost. Leave this page anyway?");
  });

  it("lets the link through when confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Page warnOnClose atRisk />);
    expect(click(screen.getByText("All invitations"))).toBe(true);
  });

  it("does not ask for a link while changes will be saved on leaving", () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<Page warnOnClose />);
    expect(click(screen.getByText("All invitations"))).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("never asks for links that open in a new tab", () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<Page warnOnClose atRisk />);
    click(screen.getByText("Help"));
    expect(confirm).not.toHaveBeenCalled();
  });

  it("warns before closing the tab while anything is unsaved, even if it will be saved on leaving", () => {
    render(<Page warnOnClose />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not warn before closing the tab when everything is saved", () => {
    render(<Page />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("useLeaveGuard sign-out and modifier clicks", () => {
  const signOut = () => {
    const waits = [];
    const event = new CustomEvent("admin:before-signout", { cancelable: true, detail: { waitFor: (p) => waits.push(p) } });
    return { proceed: window.dispatchEvent(event), waits };
  };

  it("asks when changes are at risk, and cancels sign-out if the user declines", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Page warnOnClose atRisk />);
    expect(signOut().proceed).toBe(false);
    expect(signOut().proceed).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  const unload = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("saves pending changes first instead of asking", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const flushNow = vi.fn(() => Promise.resolve({ ok: true }));
    render(<Page warnOnClose flushNow={flushNow} />);
    const { proceed, waits } = signOut();
    expect(proceed).toBe(true);
    expect(waits).toHaveLength(1);
    expect(flushNow).toHaveBeenCalledTimes(1);
    expect(unload()).toBe(true);
    await waits[0];
    expect(confirm).not.toHaveBeenCalled();
  });

  it("does not prompt on the final navigation after a successful sign-out save", async () => {
    render(<Page warnOnClose flushNow={() => Promise.resolve({ ok: true })} />);
    const { waits } = signOut();
    await waits[0];
    expect(unload()).toBe(false);
  });

  it("keeps the browser prompt when the sign-out save fails", async () => {
    render(<Page warnOnClose flushNow={() => Promise.resolve({ ok: false })} />);
    const { waits } = signOut();
    await waits[0];
    expect(unload()).toBe(true);
  });

  it("does nothing on sign-out when everything is saved", () => {
    const flushNow = vi.fn();
    render(<Page flushNow={flushNow} />);
    expect(signOut()).toEqual({ proceed: true, waits: [] });
    expect(flushNow).not.toHaveBeenCalled();
  });

  it("does not ask for ctrl-clicks", () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<Page warnOnClose atRisk />);
    // jsdom can't navigate, so cancel the click once it has passed the guard.
    const stop = (event) => event.preventDefault();
    document.addEventListener("click", stop);
    screen.getByText("All invitations").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
    document.removeEventListener("click", stop);
    expect(confirm).not.toHaveBeenCalled();
  });
});
