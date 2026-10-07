import { notFound } from "next/navigation";
import TemplatePreview from "@/AdminModule/TemplatePreview";
import { requireStaff } from "@/AdminModule/auth/server";
import { getTemplate } from "@/InvitationModule/templates/registry";

export default async function TemplateDetailPage({ params }) {
  await requireStaff();
  const template = getTemplate(params.templateId);
  if (!template) notFound();
  return (
    <TemplatePreview
      templateId={template.id}
      name={template.name}
      description={template.description}
      palettes={template.palettes.map((p) => ({ id: p.id, name: p.name, bg: p.vars["--bg"], primary: p.vars["--primary"] }))}
      defaultLanguage={template.sample.language}
    />
  );
}
