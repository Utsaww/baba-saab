import { ImageResponse } from "next/og";
import { InvitationCard } from "@/InvitationModule/og/Card";
import { cardModel } from "@/InvitationModule/og/cardModel";
import { ogFonts } from "@/InvitationModule/og/fonts";
import { getPublicInvitation } from "@/InvitationModule/server/publicInvitation";

export const dynamic = "force-dynamic";

// Always the live copy: this URL carries no preview code, so a draft's photos can never end up in a share card.
export async function GET(_request, { params }) {
  const result = await getPublicInvitation(params.slug).catch(() => null);
  if (!result || result.mode !== "live") return new Response("Not found", { status: 404 });
  return new ImageResponse(<InvitationCard model={cardModel(result.invitation)} />, {
    width: 1200,
    height: 630,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
