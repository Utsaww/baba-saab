"use client";
import base from "../base/base.module.scss";
import own from "./minimal.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import TapReveal from "../../sections/reveals/TapReveal";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { formatDots } from "../../lib/datetime";
import { monogram } from "../../lib/names";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <TapReveal className={s.tapOpen} onReveal={open}>
        <span className={s.monogram}>{monogram(inv)}</span>
        <span className={s.coverDate}>{formatDots(inv.mainDate)}</span>
        <T as="span" v={UI.tapToOpen} lang={lang} className={s.tapHint} />
      </TapReveal>
    </div>
  );
}

export default function MinimalTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Opening={Opening} />;
}
