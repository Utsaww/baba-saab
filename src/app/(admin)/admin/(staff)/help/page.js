import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import guide from "../../../../../../docs/admin-guide.md";
import styles from "@/AdminModule/help.module.scss";

export const metadata = { title: "Help · Baba Saab Admin" };

export default function HelpPage() {
  return (
    <article className={styles.guide}>
      <Markdown remarkPlugins={[remarkGfm]}>{guide}</Markdown>
    </article>
  );
}
