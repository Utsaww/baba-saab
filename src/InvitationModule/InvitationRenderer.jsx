import { fontVariables } from "./templates/fonts";
import { getTemplate, themeStyle } from "./templates/registry";
import styles from "./invitation.module.scss";

// Server-safe entry point: picks the template, applies palette and font variables.
export default function InvitationRenderer({ invitation, ctx = {} }) {
  const template = getTemplate(invitation.templateId);
  if (!template) return null;
  const { Component } = template;
  return (
    <div className={`${fontVariables} ${styles.wrapper}`} style={themeStyle(template, invitation.theme.palette)}>
      <Component invitation={invitation} ctx={ctx} />
    </div>
  );
}
