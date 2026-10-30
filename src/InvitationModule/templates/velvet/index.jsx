"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import base from "../base/base.module.scss";
import own from "./velvet.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { CoverBase, SECTION_COMPONENTS } from "../base/BaseSections";
import EnvelopeReveal from "../../sections/reveals/EnvelopeReveal";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { plainText } from "../../lib/i18n";
import { formatDotsRange } from "../../lib/datetime";
import { coupleTitle, monogram } from "../../lib/names";
import { visibleSections } from "../../lib/sections";
import { mergeStyles } from "../../lib/styles";
import useFadeUp from "./useFadeUp";
import FloralArch from "./FloralArch";
import Emboss from "./Emboss";
import Petals from "../../sections/Petals";

const s = mergeStyles(base, own);
// Fade classes exist only in this template's module, so take them from it directly.
const FADE = { pending: own.fadePending, shown: own.fadeIn };
// Lets the opening tell the page that the envelope has been opened (to start the petals).
const OpenedContext = createContext(() => {});

// Step the envelope card's script down for long names so they wrap onto two lines at most.
function nameLength(title) {
  const n = Array.from(title).length;
  return n > 24 ? "long" : n > 16 ? "medium" : "short";
}

function Opening({ inv, lang, open }) {
  const markOpened = useContext(OpenedContext);
  const cardLang = lang === "hi" ? "hi" : "en";
  const title = coupleTitle(inv, cardLang);
  return (
    <div className={s.openingInner}>
      <T as="p" v={UI.weddingOf} lang={lang} className={s.openingEyebrow} />
      <EnvelopeReveal
        className={s.envelope}
        label={plainText(UI.tapToOpen, lang)}
        onReveal={() => {
          open();
          markOpened();
        }}
      >
        <span className={s.envBack} aria-hidden="true" />
        {/* The card that slides out: the same plum card the invitation is printed on. */}
        <span className={s.letter}>
          <span className={s.letterOrnament} aria-hidden="true" />
          <span className={s.letterNames} lang={cardLang === "hi" ? "hi" : undefined} data-length={nameLength(title)}>
            {title}
          </span>
          <span className={s.letterDate}>{formatDotsRange(inv.mainDate, inv.mainDateEnd)}</span>
        </span>
        <span className={s.pocket} aria-hidden="true">
          <Emboss className={s.emboss} seed={11} />
        </span>
        <span className={s.flap} aria-hidden="true">
          <span className={s.flapFront}>
            <Emboss className={s.emboss} seed={23} rows={5} height={58} />
          </span>
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
    <div className={s.coverFrame}>
      <div className={s.archBlock}>
        <FloralArch label={plainText(UI.floralArch, props.lang)} />
        {/* Decorative: the full names follow straight after, so screen readers skip the initials. */}
        <span className={s.archMonogram} aria-hidden="true">
          {monogram(props.inv)}
        </span>
      </div>
      <CoverBase {...props} />
    </div>
  );
}

const SharedVenue = SECTION_COMPONENTS.venue;
const SharedRsvp = SECTION_COMPONENTS.rsvp;

// The shared venue section, then a pill that jumps to the RSVP form when RSVP is on.
function Venue(props) {
  const { inv, lang } = props;
  return (
    <>
      <SharedVenue {...props} />
      {visibleSections(inv).includes("rsvp") && (
        <div className={s.venueRsvp}>
          <a className={s.rsvpPill} href="#rsvp">
            <T v={UI.sendRsvp} lang={lang} />
          </a>
        </div>
      )}
    </>
  );
}

// The shared RSVP section with an anchor for the venue's pill.
function Rsvp(props) {
  return (
    <>
      <span id="rsvp" className={s.rsvpAnchor} aria-hidden="true" />
      <SharedRsvp {...props} />
    </>
  );
}

const SECTIONS = { venue: Venue, rsvp: Rsvp };

export default function VelvetTemplate({ invitation, ctx }) {
  const ref = useRef(null);
  const [opened, setOpened] = useState(Boolean(ctx?.skipOpening));
  const markOpened = useCallback(() => setOpened(true), []);
  useFadeUp(ref, FADE);
  return (
    <OpenedContext.Provider value={markOpened}>
      <div ref={ref} className={s.scope} data-lang={invitation.language}>
        <TemplateFrame inv={invitation} ctx={ctx} s={s} Cover={Cover} Opening={Opening} sections={SECTIONS} />
        <Petals active={opened} className={own.petals} />
      </div>
    </OpenedContext.Provider>
  );
}
