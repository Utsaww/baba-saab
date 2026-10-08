import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import guide from "../../../../../../docs/admin-guide.md";
import styles from "@/AdminModule/help.module.scss";
import { slugify, textOf } from "@/AdminModule/guideAnchors";
import { requireStaff } from "@/AdminModule/auth/server";

export const metadata = { title: "Help · Baba Saab Admin" };

export default async function HelpPage() {
  await requireStaff();
  return (
    <article className={styles.guide}>
      <Markdown remarkPlugins={[remarkGfm]} components={{ h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2> }}>
        {guide}
      </Markdown>
    </article>
  );
}
