"use client";

import { useEffect, useId, useRef, useState } from "react";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { MUSIC_ACCEPT, newKey, validateMusic } from "@/AdminModule/media/files";
import { uploadMedia } from "@/AdminModule/media/storage";
import { pickerButton } from "./PhotoSlot";
import UploadStatus from "./UploadStatus";

const selectClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm";

export const PLAY_EVENT = "media:play";

export function PlayButton({ src, label }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  // Another PlayButton started: only one song plays at a time.
  useEffect(() => {
    const onOtherPlay = (event) => {
      if (event.detail === audio.current) return;
      audio.current?.pause();
      setPlaying(false);
    };
    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, []);
  useEffect(() => {
    audio.current?.pause();
    setPlaying(false);
  }, [src]);
  if (!src) return null;
  return (
    <>
      <audio ref={audio} src={src} preload="none" onEnded={() => setPlaying(false)} />
      <button
        type="button"
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        onClick={() => {
          if (playing) {
            audio.current.pause();
            setPlaying(false);
          } else {
            const element = audio.current;
            window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: element }));
            Promise.resolve(element.play()).then(
              () => setPlaying(true),
              () => {},
            );
          }
        }}
        className={pickerButton}
      >
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
    </>
  );
}

export default function MusicPicker({ music, onChange, tracks, tracksError = false, folder, uploads }) {
  const [mode, setMode] = useState(music?.type ?? "none");
  const [error, setError] = useState(null);
  const songId = useId();
  const items = uploads.items.filter((item) => item.group === "music");
  const libraryTrack = music?.type === "library" ? tracks.find((t) => t.id === music.trackId) : null;

  function choose(next) {
    setMode(next);
    setError(null);
    if (next === "none") {
      supersede();
      onChange(undefined);
    }
  }

  function supersede() {
    items.forEach((item) => uploads.dismiss(item.id));
  }

  function pickSong(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validateMusic(file);
    setError(problem);
    if (problem) return;
    uploads.start({
      label: file.name,
      group: "music",
      replaceGroup: true,
      run: (onProgress) => uploadMedia({ key: newKey(folder, "mp3"), blob: file, contentType: "audio/mpeg", onProgress }),
      onDone: (key) => onChange({ type: "upload", key }),
    });
  }

  const option = (value, text) => (
    <label className="flex min-h-[44px] items-center gap-2 text-sm">
      <input type="radio" name="music-mode" value={value} checked={mode === value} onChange={() => choose(value)} className="h-5 w-5" />
      {text}
    </label>
  );

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Background music">
        {option("none", "No music")}
        {option("library", "From the Music Library")}
        {option("upload", "Upload a song for this invitation")}
      </div>

      {mode === "library" &&
        (tracksError ? (
          <p role="alert" className="text-sm text-red-700">
            Couldn't load the Music Library — refresh the page to try again.
          </p>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-stone-600">No songs in the Music Library yet — add some under Music in the menu.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor={songId} className="text-sm font-medium">
                Song
              </label>
              <select
                id={songId}
                value={music?.type === "library" ? music.trackId : ""}
                onChange={(e) => {
                  const track = tracks.find((t) => t.id === e.target.value);
                  supersede();
                  onChange(track ? { type: "library", trackId: track.id, key: track.key } : undefined);
                }}
                className={selectClass}
              >
                <option value="">Choose a song…</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {libraryTrack && <PlayButton src={mediaUrl(libraryTrack.key)} label={libraryTrack.name} />}
          </div>
        ))}

      {mode === "upload" && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">Only upload music you have the rights to use.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className={pickerButton}>
              {music?.type === "upload" ? "Replace song" : "Choose MP3"}
              <input type="file" accept={MUSIC_ACCEPT} aria-label="Choose a song" onChange={pickSong} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            {music?.type === "upload" && <PlayButton src={mediaUrl(music.key)} label="the uploaded song" />}
          </div>
          <UploadStatus items={items} uploads={uploads} />
        </div>
      )}

      {music && music.type !== mode && mode !== "none" && (
        <p className="text-xs text-stone-600">Your current song keeps playing until you choose a new one.</p>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
