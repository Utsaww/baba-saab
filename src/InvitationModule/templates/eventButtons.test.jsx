import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { getTemplate } from "./registry";

const MAP = "Open in Google Maps";
const build = ({ a = {}, venue = {} } = {}) =>
  parseInvitation({
    ...getTemplate("minimal").sample,
    language: "en",
    venue: { name: { en: "Hall" }, address: { en: "Street" }, mapsUrl: "https://maps.app.goo.gl/v", ...venue },
    events: [
      { id: "a", name: { en: "Alpha" }, date: "2026-12-11", time: "10:00", mapsUrl: "https://maps.app.goo.gl/a", ...a },
      { id: "b", name: { en: "Beta" }, date: "2026-12-11", time: "12:00", mapsUrl: "https://maps.app.goo.gl/b" },
    ],
  });
const view = (inv) => {
  const { container } = render(<InvitationRenderer invitation={inv} ctx={{ skipOpening: true }} />);
  const items = container.querySelectorAll("[data-section=schedule] li");
  return { items, venue: container.querySelector("[data-section=venue]") };
};

describe("per-event buttons", () => {
  it("hides the map link only on the event with hideMap", () => {
    const { items, venue } = view(build({ a: { hideMap: true } }));
    expect(within(items[0]).queryByText(MAP)).toBeNull();
    expect(within(items[1]).getByText(MAP)).toBeTruthy();
    expect(within(venue).getByText(MAP)).toBeTruthy();
  });

  it("hides both calendar buttons only on the event with hideCalendar", () => {
    const { items } = view(build({ a: { hideCalendar: true } }));
    expect(within(items[0]).queryByText("Add to Google Calendar")).toBeNull();
    expect(within(items[0]).queryByText("Download (.ics)")).toBeNull();
    expect(within(items[1]).getByText("Add to Google Calendar")).toBeTruthy();
    expect(within(items[1]).getByText("Download (.ics)")).toBeTruthy();
  });

  it("venue.hideMap hides only the venue button", () => {
    const { items, venue } = view(build({ venue: { hideMap: true } }));
    expect(within(venue).queryByText(MAP)).toBeNull();
    expect(within(items[0]).getByText(MAP)).toBeTruthy();
    expect(within(items[1]).getByText(MAP)).toBeTruthy();
  });
});
