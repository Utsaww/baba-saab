"use client";
import base from "../base/base.module.scss";
import own from "./temple.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import EnvelopeReveal from "../../sections/reveals/EnvelopeReveal";
import Emblem from "../../sections/Emblem";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { plainText } from "../../lib/i18n";
import { monogram } from "../../lib/names";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <Emblem deity={inv.invocation.deity} className={s.openingEmblem} />
      <EnvelopeReveal className={s.envelope} label={plainText(UI.tapToOpen, lang)} onReveal={open}>
        <span className={s.flap} />
        <span className={s.letter}>
          <T v={inv.couple.bride.name} lang={lang} /> &amp; <T v={inv.couple.groom.name} lang={lang} />
        </span>
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
    <>
      <div className={s.kolam} aria-hidden="true" />
      <CoverBase {...props} />
      <div className={s.kolam} aria-hidden="true" />
    </>
  );
}

export default function TempleTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />;
}
