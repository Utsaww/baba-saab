import { notFound } from "next/navigation";
import FamilyRsvps from "@/InvitationModule/public/FamilyRsvps";
import { coupleTitle } from "@/InvitationModule/lib/names";
import { getFamilyRsvps } from "@/InvitationModule/server/familyRsvps";

// Rendered per request so the list is always current, and never cached publicly.
export const dynamic = "force-dynamic";

const tokenFrom = (searchParams) => (typeof searchParams?.k === "string" ? searchParams.k : "");

export async function generateMetadata({ params, searchParams }) {
  const robots = { index: false, follow: false };
  const token = tokenFrom(searchParams);
  const data = token ? await getFamilyRsvps(params.slug, token).catch(() => null) : null;
  if (!data) return { title: "RSVPs", robots };
  return { title: `RSVPs — ${coupleTitle({ couple: data.couple }, data.language === "hi" ? "hi" : "en")}`, robots };
}

export default async function FamilyRsvpsPage({ params, searchParams }) {
  const token = tokenFrom(searchParams);
  if (!token) notFound();
  const data = await getFamilyRsvps(params.slug, token);
  if (!data) notFound();
  return <FamilyRsvps slug={params.slug} data={data} />;
}
