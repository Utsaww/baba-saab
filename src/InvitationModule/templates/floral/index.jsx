"use client";
import base from "../base/base.module.scss";
import own from "./floral.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import ScrollReveal from "../../sections/reveals/ScrollReveal";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { formatDots } from "../../lib/datetime";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);
const LEAF_ANGLES = [-60, -30, 0, 30, 60];

function FloralCorner({ className }) {
  return (
    <svg className={className} viewBox="0 0 140 140" aria-hidden="true">
      <path d="M10 130 Q 60 80 130 10" fill="none" stroke="currentColor" strokeWidth="2" />
      {LEAF_ANGLES.map((deg, i) => (
        <ellipse key={deg} cx={30 + i * 20} cy={110 - i * 20} rx="14" ry="6" fill="currentColor" transform={`rotate(${deg} ${30 + i * 20} ${110 - i * 20})`} />
      ))}
      <circle cx="120" cy="20" r="9" fill="currentColor" />
    </svg>
  );
}

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <ScrollReveal className={s.scrollOpen} onReveal={open}>
        <T as="span" v={UI.weddingOf} lang={lang} className={s.eyebrow} />
        <span className={s.openingNames}>
          <T v={inv.couple.bride.name} lang={lang} /> &amp; <T v={inv.couple.groom.name} lang={lang} />
        </span>
        <span className={s.coverDate}>{formatDots(inv.mainDate)}</span>
        <T as="span" v={UI.scrollToOpen} lang={lang} className={s.scrollHint} />
      </ScrollReveal>
    </div>
  );
}

function Cover(props) {
  return (
    <div className={s.floralCover}>
      <FloralCorner className={`${s.floralCorner} ${s.cornerTopLeft}`} />
      <CoverBase {...props} />
      <FloralCorner className={`${s.floralCorner} ${s.cornerBottomRight}`} />
    </div>
  );
}

export default function FloralTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />;
}
