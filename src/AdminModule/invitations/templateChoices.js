import { TEMPLATES } from "@/InvitationModule/templates/registry";

/** Templates as plain data (no components), safe to pass to client components. */
export function templateChoices() {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    palettes: t.palettes.map((p) => ({ id: p.id, name: p.name, bg: p.vars["--bg"], primary: p.vars["--primary"] })),
  }));
}
