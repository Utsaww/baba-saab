import { notFound } from "next/navigation";
import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import PreviewBanner from "@/InvitationModule/public/PreviewBanner";
import { getPublicInvitation } from "@/InvitationModule/server/publicInvitation";
import { ogDescription, ogTitle, PREVIEW_TITLE } from "@/InvitationModule/lib/ogText";

// Rendered per request (plan ruling R1): Update live shows at once, and a preview visit never touches what guests see.
export const dynamic = "force-dynamic";

const tokenFrom = (searchParams) => (typeof searchParams?.preview === "string" ? searchParams.preview : undefined);

export async function generateMetadata({ params, searchParams }) {
  const result = await getPublicInvitation(params.slug, tokenFrom(searchParams)).catch(() => null);
  const robots = { index: false, follow: false };
  if (!result) return { title: "Invitation", robots };
  if (result.mode === "preview") {
    return { title: PREVIEW_TITLE, robots, openGraph: { title: PREVIEW_TITLE, images: ["/api/og/invitation-preview"] } };
  }
  const title = ogTitle(result.invitation);
  const description = ogDescription(result.invitation);
  const image = `/invitation/${params.slug}/card`;
  return {
    title,
    description,
    robots,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PublicInvitationPage({ params, searchParams }) {
  const result = await getPublicInvitation(params.slug, tokenFrom(searchParams));
  if (!result) notFound();
  return (
    <>
      {result.mode === "preview" ? <PreviewBanner /> : null}
      <InvitationRenderer invitation={result.invitation} ctx={{ mode: result.mode, slug: params.slug }} />
    </>
  );
}
