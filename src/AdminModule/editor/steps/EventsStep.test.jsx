import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventsStep from "./EventsStep";
import { renderStep } from "../test-utils";

const base = () => ({ templateId: "royal", theme: { palette: "maroon-gold" }, language: "en", mainDate: "2027-02-14" });

afterEach(() => vi.restoreAllMocks());

describe("EventsStep", () => {
  it("adds a common event with its English and Hindi name, dated on the wedding day", async () => {
    const { latest } = renderStep(EventsStep, base());
    await userEvent.click(screen.getByRole("button", { name: "+ Sangeet" }));
    const [event] = latest().events;
    expect(event).toMatchObject({ name: { en: "Sangeet", hi: "संगीत" }, date: "2027-02-14" });
    expect(event.id).toMatch(/^[a-z0-9]{6,}$/i);
  });

  it("adds a blank event with no date when there is no wedding date yet", async () => {
    const { latest } = renderStep(EventsStep, { ...base(), mainDate: undefined });
    await userEvent.click(screen.getByRole("button", { name: "+ Other event" }));
    expect(latest().events[0]).toEqual({ id: expect.any(String), name: {} });
  });

  it("edits, reorders and removes events", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const start = { ...base(), events: [{ id: "a", name: { en: "Haldi" } }, { id: "b", name: { en: "Mehendi" } }] };
    const { latest } = renderStep(EventsStep, start);
    fireEvent.change(screen.getAllByLabelText("Time")[0], { target: { value: "10:00" } });
    expect(latest().events[0].time).toBe("10:00");
    await userEvent.click(screen.getByRole("button", { name: "Move Mehendi up" }));
    expect(latest().events.map((e) => e.id)).toEqual(["b", "a"]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Haldi" }));
    expect(confirm).toHaveBeenCalledWith("Remove Haldi? This can't be undone.");
    expect(latest().events.map((e) => e.id)).toEqual(["b"]);
  });

  it("keeps the event when removing is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { latest } = renderStep(EventsStep, { ...base(), events: [{ id: "a", name: { en: "Haldi" } }] });
    await userEvent.click(screen.getByRole("button", { name: "Remove Haldi" }));
    expect(latest().events.map((e) => e.id)).toEqual(["a"]);
  });

  it("still adds events when crypto.randomUUID is unavailable", async () => {
    vi.stubGlobal("crypto", {});
    const { latest } = renderStep(EventsStep, base());
    await userEvent.click(screen.getByRole("button", { name: "+ Other event" }));
    vi.unstubAllGlobals();
    expect(latest().events[0].id).toMatch(/^[a-z0-9]{6,10}$/);
  });

  it("explains an invalid time", () => {
    renderStep(EventsStep, { ...base(), events: [{ id: "a", name: { en: "Haldi" }, time: "25:00" }] });
    expect(screen.getByLabelText("Time")).toHaveAccessibleDescription("Use HH:mm (24-hour)");
  });
});
