"use client";
import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import base from "../base/base.module.scss";
import own from "./temple.module.scss";
import TemplateFrame from "../base/TemplateFrame";
import { SECTION_COMPONENTS } from "../base/BaseSections";
import EnvelopeReveal from "../../sections/reveals/EnvelopeReveal";
import Emblem from "../../sections/Emblem";
import Gallery from "../../sections/Gallery";
import Petals from "../../sections/Petals";
import WhatsAppShare from "../../sections/WhatsAppShare";
import T from "../../sections/Text";
import { UI } from "../../lib/ui-strings";
import { plainText } from "../../lib/i18n";
import { invocationText } from "../../lib/invocations";
import { dateParts, formatDate, formatDots } from "../../lib/datetime";
import { couplePair, coupleTitle, monogram } from "../../lib/names";
import { mediaUrl } from "../../lib/media";
import { visibleSections } from "../../lib/sections";
import { mergeStyles } from "../../lib/styles";
import ScratchDate from "./ScratchDate";
import Sparkles from "./Sparkles";

const s = mergeStyles(base, own);

// The hero shows the invocation and the couple (with parents), so they aren't repeated as sections.
export const TEMPLE_COVER_SECTIONS = ["invocation", "couple"];

// Flap, sparkles and rising letter, then the overlay fades. Under reduced motion: a quick fade.
const OPEN_MS = 2000;
const OPEN_REDUCED_MS = 250;
const reducedMotion = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const dateLang = (lang) => (lang === "hi" ? "hi" : "en");
const NO_GATE = { applies: false, open: true, lockedIds: new Set() };

// Tells the opening that the envelope was tapped (petals start once it has opened).
const OpenedContext = createContext(() => {});
// The Save the Date lock: card state, and which sections wait behind it.
const GateContext = createContext(NO_GATE);

// ---------- Opening: the sealed wine envelope ----------
function Opening({ inv, lang, open }) {
  const markOpened = useContext(OpenedContext);
  const [bursting, setBursting] = useState(false);
  const mono = monogram(inv);
  return (
    <div className={s.openingInner}>
      <T as="p" v={UI.weddingOf} lang={lang} className={s.openingEyebrow} />
      <p className={s.openingNames}>
        {lang === "both" ? (
          <>
            <span>{coupleTitle(inv, "en")}</span>
            <span className={s.openingNamesHi} lang="hi">
              {coupleTitle(inv, "hi")}
            </span>
          </>
        ) : (
          <span lang={lang === "hi" ? "hi" : undefined}>{coupleTitle(inv, dateLang(lang))}</span>
        )}
      </p>
      <div className={s.envelopeStage}>
        <EnvelopeReveal
          className={s.envelope}
          label={plainText(UI.openInvitation, lang)}
          delay={() => (reducedMotion() ? OPEN_REDUCED_MS : OPEN_MS)}
          onOpen={() => setBursting(true)}
          onReveal={() => {
            open();
            markOpened();
          }}
        >
          <span className={s.envBack} aria-hidden="true" />
          {/* The letter peeks out of the pocket: a small monogram and the date. */}
          <span className={s.letter} data-part="letter">
            <span className={s.letterMono}>{mono}</span>
            <span className={s.letterRule} aria-hidden="true" />
            <span className={s.letterDate}>{formatDots(inv.mainDate)}</span>
          </span>
          <span className={s.envLeft} aria-hidden="true" />
          <span className={s.envRight} aria-hidden="true" />
          <span className={s.envBottom} aria-hidden="true" />
          <span className={s.flapShadow} aria-hidden="true" />
          <span className={s.flap} aria-hidden="true">
            <span className={s.flapOuter} />
            <span className={s.flapInner} />
          </span>
          <span className={s.seal} data-part="seal" aria-hidden="true">
            <span className={s.sealMono}>{mono}</span>
          </span>
          <Sparkles active={bursting} className={s.sparkles} />
        </EnvelopeReveal>
      </div>
      <T as="p" v={UI.tapToOpen} lang={lang} className={s.tapHint} />
    </div>
  );
}

// ---------- Hero (the cover) ----------
function Person({ person, lang }) {
  return (
    <span className={s.heroPerson}>
      <T v={person.name} lang={lang} className={s.heroName} />
      <T v={person.parentsLine} lang={lang} className={s.heroParents} />
    </span>
  );
}

function Hero({ inv, lang }) {
  const shown = visibleSections(inv);
  const withInvocation = shown.includes("invocation");
  const withParents = shown.includes("couple");
  const [first, second] = couplePair(inv);
  const strip = (p) => (withParents ? p : { ...p, parentsLine: undefined });
  return (
    <header className={s.hero}>
      {inv.media.coverKey && (
        <div className={s.coverImage}>
          <Image src={mediaUrl(inv.media.coverKey)} alt="" fill priority sizes="(max-width: 560px) 100vw, 520px" />
        </div>
      )}
      <div className={s.heroFrame}>
        {withInvocation && (
          <>
            <Emblem deity={inv.invocation.deity} className={s.heroEmblem} />
            <T as="p" v={invocationText(inv.invocation)} lang={lang} className={s.shloka} />
          </>
        )}
        <span className={s.heroOrnament} aria-hidden="true" />
        <T as="p" v={UI.blessing} lang={lang} className={s.blessing} />
        <h1 className={s.heroNames}>
          <Person person={strip(first)} lang={lang} />
          <span className={s.heroAmp}>&amp;</span>
          <Person person={strip(second)} lang={lang} />
        </h1>
        <div className={s.scrollCue} aria-hidden="true">
          <T v={UI.scrollCue} lang={lang} />
          <span className={s.scrollChevron} />
        </div>
      </div>
    </header>
  );
}

// ---------- Sections ----------
function TempleSection({ id, title, eyebrow, lang, children }) {
  return (
    <section className={[s.section, s[`section_${id}`]].filter(Boolean).join(" ")} data-section={id} aria-labelledby={title ? `sec-${id}` : undefined}>
      {eyebrow && <T as="p" v={eyebrow} lang={lang} className={s.sectionEyebrow} />}
      {title && (
        <h2 id={`sec-${id}`} className={s.sectionTitle}>
          <T v={title} lang={lang} />
        </h2>
      )}
      {children}
    </section>
  );
}

function SaveTheDate({ inv, lang }) {
  const gate = useContext(GateContext);
  const parts = dateParts(inv.mainDate, dateLang(lang));
  const longDate = formatDate(inv.mainDate, dateLang(lang));
  return (
    <TempleSection id="saveTheDate" title={UI.saveTheDate} lang={lang}>
      {parts && <ScratchDate parts={parts} lang={lang} revealed={gate.revealed} onReveal={gate.reveal} cardRefs={gate.cardRefs} />}
      {!gate.open && (
        <div className={s.lockNote}>
          <T as="p" v={UI.scratchToUnlock} lang={lang} className={s.lockText} />
          <button type="button" className={s.revealBtn} onClick={gate.revealAll}>
            <T v={UI.revealAll} lang={lang} />
          </button>
        </div>
      )}
      <div aria-live="polite">
        {gate.open && longDate && (
          <p ref={gate.dateRef} tabIndex={-1} className={s.longDate} lang={lang === "hi" ? "hi" : undefined}>
            {longDate}
            {lang === "both" && (
              <span className={s.longDateHi} lang="hi">
                {formatDate(inv.mainDate, "hi")}
              </span>
            )}
          </p>
        )}
      </div>
    </TempleSection>
  );
}

function GallerySection({ inv, lang, s: styles }) {
  return (
    <TempleSection id="gallery" title={UI.gallery} eyebrow={UI.foreverUs} lang={lang}>
      <Gallery items={inv.media.gallery} lang={lang} s={styles} />
    </TempleSection>
  );
}

function Closing({ inv, lang, s: styles }) {
  const { hosts } = inv;
  const [first, second] = couplePair(inv);
  return (
    <TempleSection id="closing" lang={lang}>
      <span className={s.heroOrnament} aria-hidden="true" />
      <T as="p" v={hosts.closingLine} lang={lang} className={s.closingLine} />
      {hosts.families.length > 0 && (
        <>
          <T as="p" v={UI.warmRegards} lang={lang} className={s.sectionEyebrow} />
          <ul className={s.families}>
            {hosts.families.map((family, i) => (
              <T key={i} as="li" v={family} lang={lang} />
            ))}
          </ul>
        </>
      )}
      <p className={s.closingNames} data-part="closing-names">
        <T v={first.name} lang={lang} /> <span className={s.heroAmp}>&amp;</span> <T v={second.name} lang={lang} />
      </p>
      {hosts.contactPhone && (
        <a className={s.contact} href={`tel:${hosts.contactPhone}`}>
          {hosts.contactPhone}
        </a>
      )}
      <WhatsAppShare message={`${coupleTitle(inv)} · ${formatDots(inv.mainDate)}`} lang={lang} s={styles} />
    </TempleSection>
  );
}

// Sections after Save the Date wait, hidden and inert, until all three cards are revealed.
function gated(id, Section) {
  function Gated(props) {
    const gate = useContext(GateContext);
    if (!gate.lockedIds.has(id)) return <Section {...props} />;
    const locked = !gate.open;
    return (
      <div className={locked ? undefined : s.gateOpen} hidden={locked} inert={locked ? "" : undefined} aria-hidden={locked ? "true" : undefined}>
        <Section {...props} />
      </div>
    );
  }
  Gated.displayName = `Gated(${id})`;
  return Gated;
}

const OWN = { saveTheDate: SaveTheDate, gallery: GallerySection, closing: Closing };
const SECTIONS = Object.fromEntries(
  Object.keys(SECTION_COMPONENTS)
    .filter((id) => !TEMPLE_COVER_SECTIONS.includes(id))
    .map((id) => [id, id === "saveTheDate" ? SaveTheDate : gated(id, OWN[id] ?? SECTION_COMPONENTS[id])]),
);

// Card state and the lock. No lock in the editor preview, without a date, or with Save the Date hidden.
function useGate(inv, ctx) {
  const ids = visibleSections(inv).filter((id) => !TEMPLE_COVER_SECTIONS.includes(id));
  const at = ids.indexOf("saveTheDate");
  const applies = !ctx?.skipOpening && Boolean(dateParts(inv.mainDate)) && at >= 0;
  const lockedKey = applies ? ids.slice(at + 1).join(",") : "";
  const lockedIds = useMemo(() => new Set(lockedKey ? lockedKey.split(",") : []), [lockedKey]);

  const [cards, setCards] = useState([false, false, false]);
  const latest = useRef(cards); // the cards as last set, for back-to-back reveals in one tick
  const cardRefs = useRef([]);
  const dateRef = useRef(null);
  const focusNext = useRef(null); // after a reveal: the next card's index, "date", or null
  const open = !applies || cards.every(Boolean);

  const reveal = useCallback((i) => {
    const prev = latest.current;
    if (prev[i]) return;
    const next = prev.map((v, j) => v || j === i);
    latest.current = next;
    // Keep keyboard users moving: on to the next hidden card, or to the full date when done.
    const rest = [...next.keys()].filter((j) => !next[j]);
    const fromKeyboard = document.activeElement === cardRefs.current[i];
    focusNext.current = fromKeyboard ? (rest.find((j) => j > i) ?? rest[0] ?? "date") : null;
    setCards(next);
  }, []);
  const revealAll = useCallback(() => {
    latest.current = [true, true, true];
    focusNext.current = "date";
    setCards(latest.current);
  }, []);

  // After a reveal: move focus where the guest would go next. Once everything is open, bring the
  // full date into view (smoothly, unless the guest prefers reduced motion).
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target !== null && target !== "date") cardRefs.current[target]?.focus?.({ preventScroll: true });
    if (!applies || !cards.every(Boolean)) return;
    const date = dateRef.current;
    if (target === "date") date?.focus?.({ preventScroll: true });
    date?.scrollIntoView?.({ block: target === "date" ? "center" : "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [cards, applies]);

  return {
    applies,
    open,
    lockedIds,
    revealed: open ? [true, true, true] : cards,
    reveal,
    revealAll,
    cardRefs,
    dateRef,
  };
}

export default function TempleTemplate({ invitation, ctx }) {
  const [opened, setOpened] = useState(Boolean(ctx?.skipOpening));
  const markOpened = useCallback(() => setOpened(true), []);
  const gate = useGate(invitation, ctx);
  return (
    <OpenedContext.Provider value={markOpened}>
      <GateContext.Provider value={gate}>
        <div className={s.scope} data-lang={invitation.language}>
          <TemplateFrame
            inv={invitation}
            ctx={ctx}
            s={s}
            Cover={Hero}
            Opening={Opening}
            sections={SECTIONS}
            coverSections={TEMPLE_COVER_SECTIONS}
          />
          <Petals active={opened} count={18} className={own.petals} />
        </div>
      </GateContext.Provider>
    </OpenedContext.Provider>
  );
}
