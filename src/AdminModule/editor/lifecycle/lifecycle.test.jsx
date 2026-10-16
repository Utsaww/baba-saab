import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatDate } from "@/InvitationModule/lib/datetime";
import { addDays, todayIST } from "@/InvitationModule/lib/lifecycle";
import LifecycleBanner from "./LifecycleBanner";
import InvitationMenu from "./InvitationMenu";
import EraseDialog from "./EraseDialog";
import OfflineDateField from "./OfflineDateField";

const today = todayIST();
const tomorrow = addDays(today, 1);

afterEach(() => vi.restoreAllMocks());

describe("LifecycleBanner", () => {
  const offline = { status: "offline", offlineOn: "2026-10-01", offlineAt: "2026-10-01T22:00:00.000Z", purgeAt: "2026-10-31T22:00:00.000Z" };

  it("says when an offline invitation went offline and when it will be erased", () => {
    render(<LifecycleBanner {...offline} onPutOnline={vi.fn()} />);
    // 22:00 UTC is already the next day in India.
    expect(screen.getByRole("status")).toHaveTextContent(
      "Offline since Friday, 2 October 2026 — will be erased on Sunday, 1 November 2026",
    );
    expect(screen.getByRole("button", { name: "Put back online" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("says when a deleted invitation will be erased, with Restore and Delete permanently now", async () => {
    const onRestore = vi.fn(async () => ({ ok: true }));
    const onEraseNow = vi.fn();
    render(<LifecycleBanner status="deleted" deletedAt="2026-10-05T05:00:00.000Z" purgeAt="2026-11-04T05:00:00.000Z" onRestore={onRestore} onEraseNow={onEraseNow} />);
    expect(screen.getByRole("status")).toHaveTextContent("Deleted — will be erased on Wednesday, 4 November 2026");
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(onRestore).toHaveBeenCalledWith(undefined);
    await userEvent.click(screen.getByRole("button", { name: "Delete permanently now" }));
    expect(onEraseNow).toHaveBeenCalled();
  });

  it("renders nothing for draft and live invitations", () => {
    const { container, rerender } = render(<LifecycleBanner status="draft" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<LifecycleBanner status="published" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("asks for a date after today before putting it back online", async () => {
    const onPutOnline = vi.fn(async () => ({ ok: true }));
    render(<LifecycleBanner {...offline} onPutOnline={onPutOnline} />);
    await userEvent.click(screen.getByRole("button", { name: "Put back online" }));
    const date = screen.getByLabelText("Take offline on");
    expect(date).toHaveAttribute("type", "date");
    expect(date).toHaveAttribute("min", tomorrow);
    // The stored date has passed, so nothing is filled in.
    expect(date).toHaveValue("");
    fireEvent.change(date, { target: { value: today } });
    await userEvent.click(screen.getByRole("button", { name: "Put online" }));
    expect(screen.getByText("Pick a date after today")).toBeInTheDocument();
    expect(onPutOnline).not.toHaveBeenCalled();
    fireEvent.change(date, { target: { value: tomorrow } });
    await userEvent.click(screen.getByRole("button", { name: "Put online" }));
    expect(onPutOnline).toHaveBeenCalledWith(tomorrow);
  });

  it("suggests the stored offline date when it is still ahead", async () => {
    const later = addDays(today, 10);
    render(<LifecycleBanner {...offline} offlineOn={later} onPutOnline={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Put back online" }));
    expect(screen.getByLabelText("Take offline on")).toHaveValue(later);
  });

  it("asks for a new date when Restore is refused because the offline date has passed, then retries with it", async () => {
    const onRestore = vi.fn().mockResolvedValueOnce({ ok: false, message: "Pick a date after today" }).mockResolvedValueOnce({ ok: true });
    render(<LifecycleBanner status="deleted" purgeAt="2026-11-04T05:00:00.000Z" onRestore={onRestore} onEraseNow={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByText("Pick a date after today")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Take offline on"), { target: { value: tomorrow } });
    await userEvent.click(screen.getByRole("button", { name: "Restore with this date" }));
    expect(onRestore).toHaveBeenLastCalledWith(tomorrow);
  });

  it("disables its buttons while a change is being sent", () => {
    render(<LifecycleBanner status="deleted" purgeAt="2026-11-04T05:00:00.000Z" pending onRestore={vi.fn()} onEraseNow={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Restore" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete permanently now" })).toBeDisabled();
  });
});

describe("InvitationMenu", () => {
  const open = () => userEvent.click(screen.getByRole("button", { name: "More actions" }));

  it("offers Take offline now and Delete for a live invitation", async () => {
    render(<InvitationMenu status="published" onTakeOffline={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "More actions" })).toHaveTextContent("⋯");
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    await open();
    expect(screen.getByRole("button", { name: "Take offline now" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("offers only Delete for drafts and offline invitations, and nothing once deleted", async () => {
    const { rerender } = render(<InvitationMenu status="draft" onTakeOffline={vi.fn()} onDelete={vi.fn()} />);
    await open();
    expect(screen.queryByRole("button", { name: "Take offline now" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    rerender(<InvitationMenu status="offline" onTakeOffline={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    rerender(<InvitationMenu status="deleted" onTakeOffline={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });

  it("confirms before taking offline", async () => {
    const onTakeOffline = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<InvitationMenu status="published" onTakeOffline={onTakeOffline} onDelete={vi.fn()} />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Take offline now" }));
    expect(confirm).toHaveBeenCalledWith("Guests will see 'no longer available'. You can put it back online for 30 days.");
    expect(onTakeOffline).not.toHaveBeenCalled();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Take offline now" }));
    expect(onTakeOffline).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Take offline now" })).not.toBeInTheDocument();
  });

  it("confirms before deleting, naming the erase date 30 days from today", async () => {
    const onDelete = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<InvitationMenu status="draft" onTakeOffline={vi.fn()} onDelete={onDelete} />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirm).toHaveBeenCalledWith(`It moves to Deleted and is erased on ${formatDate(addDays(today, 30))} unless restored.`);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    render(<InvitationMenu status="draft" onTakeOffline={vi.fn()} onDelete={vi.fn()} />);
    await open();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});

describe("EraseDialog", () => {
  it("explains what is erased and enables Erase now only when the link name is typed exactly", async () => {
    const onConfirm = vi.fn();
    render(<EraseDialog slug="priya-weds-rahul" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "This permanently erases the invitation, its photos, film and uploaded music, and frees its link name. Library songs are kept. Type priya-weds-rahul to confirm.",
    );
    expect(screen.getByText("priya-weds-rahul").tagName).toBe("B");
    const button = screen.getByRole("button", { name: "Erase now" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Confirmation"), "priya-weds-rahu");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Confirmation"), "l");
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onConfirm).toHaveBeenCalledWith("priya-weds-rahul");
  });

  it("asks for the word delete when there is no link name", async () => {
    render(<EraseDialog slug={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Type delete to confirm.");
    await userEvent.type(screen.getByLabelText("Confirmation"), "delete");
    expect(screen.getByRole("button", { name: "Erase now" })).toBeEnabled();
  });

  it("asks for the word delete when the link name is empty, as the server does", () => {
    render(<EraseDialog slug="" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Type delete to confirm.");
    expect(screen.getByRole("button", { name: "Erase now" })).toBeDisabled();
  });

  it("can be cancelled", async () => {
    const onCancel = vi.fn();
    render(<EraseDialog slug="a" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("OfflineDateField", () => {
  it("saves a new take-offline date", async () => {
    const onSave = vi.fn(async () => ({ ok: true }));
    const later = addDays(today, 20);
    render(<OfflineDateField value={addDays(today, 10)} onSave={onSave} lastEventDate={today} />);
    const date = screen.getByLabelText("Take offline on");
    expect(date).toHaveAttribute("type", "date");
    expect(date).toHaveAttribute("min", today);
    expect(date).toHaveValue(addDays(today, 10));
    fireEvent.change(date, { target: { value: later } });
    await userEvent.click(screen.getByRole("button", { name: "Save date" }));
    expect(onSave).toHaveBeenCalledWith(later);
  });

  it("warns when the date is before the last event", () => {
    const lastEventDate = addDays(today, 15);
    const { rerender } = render(<OfflineDateField value={addDays(today, 5)} onSave={vi.fn()} lastEventDate={lastEventDate} />);
    expect(screen.getByText(`This is before the last event (${formatDate(lastEventDate)})`)).toBeInTheDocument();
    rerender(<OfflineDateField value={addDays(today, 22)} onSave={vi.fn()} lastEventDate={lastEventDate} />);
    expect(screen.queryByText(/before the last event/)).not.toBeInTheDocument();
  });

  it("disables Save date while a change is being sent", () => {
    render(<OfflineDateField value={tomorrow} onSave={vi.fn()} pending />);
    expect(screen.getByRole("button", { name: "Save date" })).toBeDisabled();
  });
});
