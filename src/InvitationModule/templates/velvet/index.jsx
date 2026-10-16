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
// Fade classes exist only in this template's module, so take them from it directly.
const FADE = { pending: own.fadePending, shown: own.fadeIn };

// Step the envelope card's script down for long names so they wrap onto two lines at most.
function nameLength(title) {
  const n = Array.from(title).length;
  return n > 24 ? "long" : n > 16 ? "medium" : "short";
}

function Opening({ inv, lang, open }) {
  const cardLang = lang === "hi" ? "hi" : "en";
  const title = coupleTitle(inv, cardLang);
  return (
    <div className={s.openingInner}>
      <T as="p" v={UI.weddingOf} lang={lang} className={s.openingEyebrow} />
      <EnvelopeReveal className={s.envelope} label={plainText(UI.tapToOpen, lang)} onReveal={open}>
        <span className={s.envBack} aria-hidden="true" />
        {/* The card that slides out: the same plum card the invitation is printed on. */}
        <span className={s.letter}>
          <span className={s.letterOrnament} aria-hidden="true" />
          <span className={s.letterNames} lang={cardLang === "hi" ? "hi" : undefined} data-length={nameLength(title)}>
            {title}
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
