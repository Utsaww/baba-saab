import { ImageResponse } from "next/og";
import { PreviewCard } from "@/InvitationModule/og/Card";
import { ogFonts } from "@/InvitationModule/og/fonts";

// Rendered per request: next/og cannot be prerendered at build time here (its bundled font/wasm loading fails).
export const dynamic = "force-dynamic";

export async function GET() {
  return new ImageResponse(<PreviewCard />, { width: 1200, height: 630, fonts: await ogFonts() });
}
