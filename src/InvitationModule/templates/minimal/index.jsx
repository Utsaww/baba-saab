"use client";
import base from "../base/base.module.scss";
import own from "./minimal.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import TapReveal from "../../sections/reveals/TapReveal";
import T from "../../sections/Text";
import { dateProps, uiText } from "../../lib/customise";
import { monogram } from "../../lib/names";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <TapReveal className={s.tapOpen} onReveal={open}>
        <span className={s.monogram}>{monogram(inv)}</span>
        <span className={s.coverDate} {...dateProps(inv, lang)} />
        <T as="span" v={uiText(inv).tapToOpen} lang={lang} className={s.tapHint} />
      </TapReveal>
    </div>
  );
}

export default function MinimalTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Opening={Opening} />;
}
