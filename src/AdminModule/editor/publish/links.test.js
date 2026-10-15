import { describe, expect, it, vi } from "vitest";
import { downloadQr, liveUrl, previewUrl, QR_OPTIONS, qrFileName } from "./links";

describe("links", () => {
  it("builds live and preview URLs on the current host", () => {
    expect(liveUrl("https://www.babasaab.com", "priya-weds-rahul")).toBe("https://www.babasaab.com/invitation/priya-weds-rahul");
    expect(previewUrl("https://x.amplifyapp.com", "a-b", "tok_1")).toBe("https://x.amplifyapp.com/invitation/a-b?preview=tok_1");
  });
  it("names the QR file after the link", () => expect(qrFileName("priya-weds-rahul")).toBe("priya-weds-rahul-qr.png"));
  it("uses print-friendly QR settings", () => {
    expect(QR_OPTIONS).toEqual({ width: 1024, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  });
  it("downloads a PNG of the live URL", async () => {
    const toDataURL = vi.fn(async () => "data:image/png;base64,AAA");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadQr({ url: "https://www.babasaab.com/invitation/a-b", slug: "a-b", toDataURL });
    expect(toDataURL).toHaveBeenCalledWith("https://www.babasaab.com/invitation/a-b", QR_OPTIONS);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
