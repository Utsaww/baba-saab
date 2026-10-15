import { describe, expect, it } from "vitest";
import { shareableUrl, whatsappShareUrl } from "./share";

describe("shareableUrl", () => {
  it("removes the personal guest code and preview token", () => {
    expect(shareableUrl("https://site.com/invitation/a-weds-b?g=k9f2&preview=tok#rsvp")).toBe("https://site.com/invitation/a-weds-b");
  });
  it("strips the preview code from a preview page's share link", () => {
    expect(shareableUrl("https://www.babasaab.com/invitation/priya-weds-rahul?preview=abc#top")).toBe(
      "https://www.babasaab.com/invitation/priya-weds-rahul",
    );
  });
  it("keeps unrelated params", () => {
    expect(shareableUrl("https://site.com/invitation/x?lang=hi&g=1")).toBe("https://site.com/invitation/x?lang=hi");
  });
});

describe("whatsappShareUrl", () => {
  it("encodes the message", () => {
    expect(whatsappShareUrl("A & B\nhttps://x.y")).toBe("https://wa.me/?text=A%20%26%20B%0Ahttps%3A%2F%2Fx.y");
  });
});
