import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useLeaveGuard } from "./useLeaveGuard";

function Page({ active }) {
  useLeaveGuard(active);
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
  it("asks before following a link while there are unsaved changes", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Page active />);
    expect(click(screen.getByText("All invitations"))).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });

  it("lets the link through when confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Page active />);
    expect(click(screen.getByText("All invitations"))).toBe(true);
  });

  it("never asks for links that open in a new tab, or when everything is saved", () => {
    const confirm = vi.spyOn(window, "confirm");
    const { rerender } = render(<Page active />);
    click(screen.getByText("Help"));
    rerender(<Page active={false} />);
    click(screen.getByText("All invitations"));
    expect(confirm).not.toHaveBeenCalled();
  });

  it("warns before closing the tab", () => {
    render(<Page active />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
