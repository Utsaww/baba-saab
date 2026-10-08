"use client";
import OpeningOverlay from "../../sections/OpeningOverlay";
import MuteButton from "../../sections/MuteButton";
import useMusic from "../../sections/useMusic";
import T from "../../sections/Text";
import { CoverBase, SECTION_COMPONENTS } from "./BaseSections";
import { visibleSections } from "../../lib/sections";
import { musicSrc } from "../../lib/media";
import { UI } from "../../lib/ui-strings";

// Shared page skeleton: opening overlay, cover, visible sections in order, credit, music control.
export default function TemplateFrame({ inv, ctx = {}, s, Cover = CoverBase, Opening }) {
  const lang = inv.language;
  const music = useMusic(musicSrc(inv.media.music));

  return (
    <div className={s.root} data-template={inv.templateId}>
      {!ctx.skipOpening && (
        <OpeningOverlay className={s.opening} closingClassName={s.openingClosing} onOpen={music.play}>
          {(open) => <Opening inv={inv} lang={lang} s={s} open={open} />}
        </OpeningOverlay>
      )}
      <main className={s.main}>
        <Cover inv={inv} lang={lang} s={s} />
        {visibleSections(inv).map((id) => {
          const SectionComponent = SECTION_COMPONENTS[id];
          return <SectionComponent key={id} inv={inv} lang={lang} s={s} ctx={ctx} />;
        })}
      </main>
      {inv.showCredit && (
        <footer className={s.credit}>
          <T v={UI.credit} lang={lang} />
        </footer>
      )}
      {music.enabled && <MuteButton playing={music.playing} onToggle={music.toggle} className={s.muteBtn} />}
    </div>
  );
}
