"use client";
import { useState } from "react";
import { mediaUrl, youtubeId } from "../lib/media";

// YouTube loads only after a tap (thumbnail facade); uploads never preload.
export default function Film({ film, title, s = {} }) {
  const [playing, setPlaying] = useState(false);
  if (!film) return null;

  if (film.type === "upload") {
    const src = mediaUrl(film.key);
    return src ? <video className={s.filmFrame} src={src} controls preload="none" playsInline /> : null;
  }

  const id = youtubeId(film.url);
  if (!id) return null;
  if (!playing) {
    return (
      <button type="button" className={s.filmFacade} onClick={() => setPlaying(true)} aria-label={title}>
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
        <span className={s.playIcon} aria-hidden="true">
          ▶
        </span>
      </button>
    );
  }
  return (
    <iframe
      className={s.filmFrame}
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
