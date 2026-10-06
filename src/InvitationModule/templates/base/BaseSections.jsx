"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import T from "../../sections/Text";
import Emblem from "../../sections/Emblem";
import Countdown from "../../sections/Countdown";
import Gallery from "../../sections/Gallery";
import Film from "../../sections/Film";
import AddToCalendar from "../../sections/AddToCalendar";
import RsvpForm from "../../sections/RsvpForm";
import WhatsAppShare from "../../sections/WhatsAppShare";
import { UI } from "../../lib/ui-strings";
import { hasText, plainText } from "../../lib/i18n";
import { invocationText } from "../../lib/invocations";
import { formatDate, formatDots, formatTime } from "../../lib/datetime";
import { countdownTarget } from "../../lib/countdown";
import { mediaUrl } from "../../lib/media";
import { isRsvpClosed } from "../../lib/rsvp";
import { coupleTitle } from "../../lib/names";

const dateLang = (lang) => (lang === "hi" ? "hi" : "en");
const previewRsvp = (lang) => async () => ({ ok: false, message: plainText(UI.rsvpPreview, lang) });

function Section({ id, s, title, lang, children }) {
  return (
    <section className={[s.section, s[`section_${id}`]].filter(Boolean).join(" ")} data-section={id} aria-labelledby={title ? `sec-${id}` : undefined}>
      {title && (
        <h2 id={`sec-${id}`} className={s.sectionTitle}>
          <T v={title} lang={lang} />
        </h2>
      )}
      {children}
    </section>
  );
}

export function CoverBase({ inv, lang, s }) {
  const { bride, groom } = inv.couple;
  return (
    <header className={s.cover}>
      {inv.media.coverKey && (
        <div className={s.coverImage}>
          <Image src={mediaUrl(inv.media.coverKey)} alt="" fill priority sizes="100vw" />
        </div>
      )}
      <div className={s.coverContent}>
        <T as="p" v={UI.weddingOf} lang={lang} className={s.eyebrow} />
        <h1 className={s.coverNames}>
          <T v={bride.name} lang={lang} className={s.name} />
          <span className={s.amp}>&amp;</span>
          <T v={groom.name} lang={lang} className={s.name} />
        </h1>
        <p className={s.coverDate}>{formatDots(inv.mainDate)}</p>
      </div>
    </header>
  );
}

function Invocation({ inv, lang, s }) {
  return (
    <Section id="invocation" s={s}>
      <Emblem deity={inv.invocation.deity} className={s.emblem} />
      <T as="p" v={invocationText(inv.invocation)} lang={lang} className={s.invocationText} />
    </Section>
  );
}

function Couple({ inv, lang, s }) {
  return (
    <Section id="couple" s={s}>
      <T as="p" v={UI.together} lang={lang} className={s.eyebrow} />
      <div className={s.couple}>
        {[inv.couple.bride, inv.couple.groom].map((person, i) => (
          <div key={i} className={s.person}>
            {person.photoKey && (
              <div className={s.personPhoto}>
                <Image src={mediaUrl(person.photoKey)} alt={plainText(person.name, lang)} fill sizes="160px" />
              </div>
            )}
            <T as="h3" v={person.name} lang={lang} className={s.personName} />
            <T as="p" v={person.parentsLine} lang={lang} className={s.parents} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function SaveTheDate({ inv, lang, s }) {
  return (
    <Section id="saveTheDate" s={s} title={UI.saveTheDate} lang={lang}>
      <p className={s.bigDate}>{formatDots(inv.mainDate)}</p>
      <p className={s.longDate} lang={lang === "hi" ? "hi" : undefined}>
        {formatDate(inv.mainDate, dateLang(lang))}
      </p>
      {lang === "both" && (
        <p className={s.longDate} lang="hi">
          {formatDate(inv.mainDate, "hi")}
        </p>
      )}
    </Section>
  );
}

function CountdownSection({ inv, lang, s }) {
  return (
    <Section id="countdown" s={s} title={UI.countdown} lang={lang}>
      <Countdown target={countdownTarget(inv)} lang={lang} s={s} />
    </Section>
  );
}

function Venue({ inv, lang, s }) {
  const { venue } = inv;
  return (
    <Section id="venue" s={s} title={UI.venue} lang={lang}>
      <T as="h3" v={venue.name} lang={lang} className={s.venueName} />
      <T as="p" v={venue.address} lang={lang} className={s.address} />
      {venue.mapsUrl && (
        <a className={s.button} href={venue.mapsUrl} target="_blank" rel="noopener noreferrer">
          <T v={UI.openMap} lang={lang} />
        </a>
      )}
    </Section>
  );
}

function Travel({ inv, lang, s }) {
  return (
    <Section id="travel" s={s} title={UI.travel} lang={lang}>
      <T as="p" v={inv.venue.travelNotes} lang={lang} className={s.travelNotes} />
    </Section>
  );
}

function Schedule({ inv, lang, s }) {
  const title = coupleTitle(inv);
  return (
    <Section id="schedule" s={s} title={UI.schedule} lang={lang}>
      <ol className={s.events}>
        {inv.events.map((ev) => {
          const venueName = hasText(ev.venueName) ? ev.venueName : inv.venue.name;
          const address = hasText(ev.address) ? ev.address : inv.venue.address;
          const mapsUrl = ev.mapsUrl ?? inv.venue.mapsUrl;
          const time = formatTime(ev.time, dateLang(lang));
          return (
            <li key={ev.id} className={s.event}>
              <T as="h3" v={ev.name} lang={lang} className={s.eventName} />
              <p className={s.eventMeta}>
                {formatDate(ev.date, dateLang(lang))}
                {time && ` · ${time}`}
              </p>
              <T as="p" v={venueName} lang={lang} className={s.eventVenue} />
              {hasText(ev.dressCode) && (
                <p className={s.eventDress}>
                  <T v={UI.dressCode} lang={lang} />: <T v={ev.dressCode} lang={lang} />
                </p>
              )}
              <T as="p" v={ev.description} lang={lang} className={s.eventDesc} />
              {mapsUrl && (
                <a className={s.calLink} href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <T v={UI.openMap} lang={lang} />
                </a>
              )}
              <AddToCalendar
                entry={{
                  uid: `${inv.id ?? inv.slug ?? inv.templateId}-${ev.id}`,
                  title: `${plainText(ev.name, "en")} — ${title}`,
                  date: ev.date,
                  time: ev.time,
                  location: [plainText(venueName, "en"), plainText(address, "en")].filter(Boolean).join(", "),
                  details: title,
                }}
                lang={lang}
                s={s}
              />
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function GallerySection({ inv, lang, s }) {
  return (
    <Section id="gallery" s={s} title={UI.gallery} lang={lang}>
      <Gallery items={inv.media.gallery} lang={lang} s={s} />
    </Section>
  );
}

function FilmSection({ inv, lang, s }) {
  return (
    <Section id="film" s={s} title={UI.film} lang={lang}>
      <Film film={inv.media.film} title={plainText(UI.film, lang)} s={s} />
    </Section>
  );
}

function Rsvp({ inv, lang, s, ctx }) {
  const deadline = inv.rsvp.deadline ? formatDate(inv.rsvp.deadline, dateLang(lang)) : null;
  const onSubmit = ctx.mode === "preview" || !ctx.onRsvpSubmit ? previewRsvp(lang) : ctx.onRsvpSubmit;
  // Decided after mount: cached server HTML must not depend on the clock, or hydration fails after the deadline.
  const [closed, setClosed] = useState(false);
  useEffect(() => setClosed(isRsvpClosed(inv.rsvp)), [inv.rsvp]);
  return (
    <Section id="rsvp" s={s} title={UI.rsvp} lang={lang}>
      <RsvpForm
        lang={lang}
        events={inv.events}
        askGuestCount={inv.rsvp.askGuestCount}
        askMeal={inv.rsvp.askMeal}
        closed={closed}
        closedOnText={deadline}
        deadlineText={deadline}
        contactPhone={inv.hosts.contactPhone}
        onSubmit={onSubmit}
        s={s}
      />
    </Section>
  );
}

function Closing({ inv, lang, s }) {
  const { hosts } = inv;
  return (
    <Section id="closing" s={s}>
      <T as="p" v={UI.closing} lang={lang} className={s.eyebrow} />
      <T as="p" v={hosts.closingLine} lang={lang} className={s.closingLine} />
      {hosts.families.length > 0 && (
        <ul className={s.families}>
          {hosts.families.map((family, i) => (
            <T key={i} as="li" v={family} lang={lang} />
          ))}
        </ul>
      )}
      {hosts.contactPhone && (
        <a className={s.contact} href={`tel:${hosts.contactPhone}`}>
          {hosts.contactPhone}
        </a>
      )}
      <WhatsAppShare message={`${coupleTitle(inv)} · ${formatDots(inv.mainDate)}`} lang={lang} s={s} />
    </Section>
  );
}

export const SECTION_COMPONENTS = {
  invocation: Invocation,
  couple: Couple,
  saveTheDate: SaveTheDate,
  countdown: CountdownSection,
  venue: Venue,
  travel: Travel,
  schedule: Schedule,
  gallery: GallerySection,
  film: FilmSection,
  rsvp: Rsvp,
  closing: Closing,
};
