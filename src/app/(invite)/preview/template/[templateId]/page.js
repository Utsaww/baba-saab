import { notFound } from "next/navigation";
import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import { getPalette, getTemplate } from "@/InvitationModule/templates/registry";
import { LANGUAGES, parseInvitation } from "@/InvitationModule/schema/invitation";

export const metadata = { title: "Template preview", robots: { index: false, follow: false } };

export default function TemplatePreviewPage({ params, searchParams }) {
  const template = getTemplate(params.templateId);
  if (!template) notFound();
  const palette = getPalette(template, searchParams.palette).id;
  const language = LANGUAGES.includes(searchParams.lang) ? searchParams.lang : template.sample.language;
  const invitation = parseInvitation({ ...template.sample, language, theme: { ...template.sample.theme, palette } });
  return <InvitationRenderer invitation={invitation} ctx={{ mode: "preview" }} />;
}
