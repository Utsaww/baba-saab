"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { mediaUrl } from "../lib/media";
import { plainText } from "../lib/i18n";

export default function Gallery({ items, lang, s = {} }) {
  const [index, setIndex] = useState(null);
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta) => setIndex((i) => (i === null ? i : (i + delta + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (index === null) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, step]);

  const altFor = (item, i) => plainText(item.caption, lang) || `Photo ${i + 1}`;

  return (
    <>
      <div className={s.galleryGrid}>
        {items.map((item, i) => (
          <button key={item.key} type="button" className={s.galleryItem} onClick={() => setIndex(i)} aria-label={`Open ${altFor(item, i)}`}>
            <Image src={mediaUrl(item.key)} alt={altFor(item, i)} fill sizes="(max-width: 640px) 50vw, 300px" />
          </button>
        ))}
      </div>
      {index !== null && (
        <div className={s.lightbox} role="dialog" aria-modal="true" aria-label="Photo viewer">
          <div className={s.lightboxImage}>
            <Image src={mediaUrl(items[index].key)} alt={altFor(items[index], index)} fill sizes="92vw" />
          </div>
          <button type="button" className={s.lbClose} onClick={close} aria-label="Close">
            ×
          </button>
          {items.length > 1 && (
            <>
              <button type="button" className={s.lbPrev} onClick={() => step(-1)} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className={s.lbNext} onClick={() => step(1)} aria-label="Next photo">
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
