"use client";
import { shareableUrl, whatsappShareUrl } from "../lib/share";
import { UI } from "../lib/ui-strings";
import T from "./Text";

export default function WhatsAppShare({ message, lang, s = {} }) {
  function share() {
    const url = shareableUrl(window.location.href);
    window.open(whatsappShareUrl(`${message}\n${url}`), "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" className={s.shareBtn} onClick={share}>
      <T v={UI.share} lang={lang} />
    </button>
  );
}
