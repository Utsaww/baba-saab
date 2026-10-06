"use client";
import base from "../base/base.module.scss";
import own from "./royal.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase } from "../base/BaseSections";
import ScratchReveal from "../../sections/reveals/ScratchReveal";
import Emblem from "../../sections/Emblem";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { formatDots } from "../../lib/datetime";
import { plainText } from "../../lib/i18n";
import { mergeStyles } from "../../lib/styles";

const s = mergeStyles(base, own);
// Let the guest see the revealed date before the cover fades.
const REVEAL_PAUSE_MS = 1200;

function Opening({ inv, lang, open }) {
  return (
    <div className={s.openingInner}>
      <Emblem deity={inv.invocation.deity} className={s.openingEmblem} />
      <p className={s.openingNames}>
        <T v={inv.couple.bride.name} lang={lang} /> <span className={s.amp}>&amp;</span> <T v={inv.couple.groom.name} lang={lang} />
      </p>
      <T as="p" v={UI.scratchHint} lang={lang} className={s.openingHint} />
      <ScratchReveal
        className={s.scratch}
        surfaceClassName={s.scratchSurface}
        buttonClassName={s.linkButton}
        hint={plainText(UI.revealNow, lang)}
        onReveal={() => setTimeout(open, REVEAL_PAUSE_MS)}
      >
        <p className={s.scratchDate}>{formatDots(inv.mainDate)}</p>
      </ScratchReveal>
    </div>
  );
}

function Cover(props) {
  return (
    <div className={s.archFrame}>
      <CoverBase {...props} />
    </div>
  );
}

export default function RoyalTemplate({ invitation, ctx }) {
  return <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} />;
}
