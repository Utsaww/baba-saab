import { ImageResponse } from "next/og";
import { InvitationCard } from "@/InvitationModule/og/Card";
import { cardModel } from "@/InvitationModule/og/cardModel";
import { ogFonts } from "@/InvitationModule/og/fonts";
import { getPublicInvitation } from "@/InvitationModule/server/publicInvitation";

export const dynamic = "force-dynamic";

// Always the live copy: this URL carries no preview code, so a draft's photos can never end up in a share card.
export async function GET(_request, { params }) {
  let result;
  try {
    result = await getPublicInvitation(params.slug);
  } catch (err) {
    // A backend failure is temporary: 503 and no caching, so WhatsApp doesn't remember the card as missing.
    console.error("share card lookup failed", err);
    return new Response("Temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
  if (!result || result.mode !== "live") return new Response("Not found", { status: 404 });
  return new ImageResponse(<InvitationCard model={cardModel(result.invitation)} />, {
    width: 1200,
    height: 630,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
