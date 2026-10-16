"use client";
import { useRef } from "react";
import base from "../base/base.module.scss";
import own from "./velvet.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import EnvelopeReveal from "../../sections/reveals/EnvelopeReveal";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { plainText } from "../../lib/i18n";
import { formatDots } from "../../lib/datetime";
import { coupleTitle, monogram } from "../../lib/names";
import { mergeStyles } from "../../lib/styles";
import useFadeUp from "./useFadeUp";

const s = mergeStyles(base, own);
const FADE = { pending: s.fadePending, shown: s.fadeIn };

function Opening({ inv, lang, open }) {
  const cardLang = lang === "hi" ? "hi" : "en";
  return (
    <div className={s.openingInner}>
      <T as="p" v={UI.weddingOf} lang={lang} className={s.openingEyebrow} />
      <EnvelopeReveal className={s.envelope} label={plainText(UI.tapToOpen, lang)} onReveal={open}>
        <span className={s.envBack} aria-hidden="true" />
        {/* The card that slides out: the same plum card the invitation is printed on. */}
        <span className={s.letter}>
          <span className={s.letterOrnament} aria-hidden="true" />
          <span className={s.letterNames} lang={cardLang === "hi" ? "hi" : undefined}>
            {coupleTitle(inv, cardLang)}
          </span>
          <span className={s.letterDate}>{formatDots(inv.mainDate)}</span>
        </span>
        <span className={s.pocket} aria-hidden="true" />
        <span className={s.flap} aria-hidden="true" />
        <span className={s.seal} aria-hidden="true">
          {monogram(inv)}
        </span>
      </EnvelopeReveal>
      <T as="p" v={UI.tapToOpen} lang={lang} className={s.tapHint} />
    </div>
  );
}

function Cover(props) {
  return (
    <div className={s.coverFrame}>
      <CoverBase {...props} />
    </div>
  );
}

export default function VelvetTemplate({ invitation, ctx }) {
  const ref = useRef(null);
  useFadeUp(ref, FADE);
  return (
    <div ref={ref} className={s.scope} data-lang={invitation.language}>
      <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />
    </div>
  );
}
