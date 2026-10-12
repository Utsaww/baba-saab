"use client";

import { useState } from "react";
import { LIBRARY_PREFIX } from "@/InvitationModule/lib/mediaKeys";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { MUSIC_ACCEPT, newKey, validateMusic } from "@/AdminModule/media/files";
import { readDuration } from "@/AdminModule/media/audio";
import { deleteMedia, uploadMedia } from "@/AdminModule/media/storage";
import { PlayButton } from "@/AdminModule/editor/media/MusicPicker";
import { pickerButton } from "@/AdminModule/editor/media/PhotoSlot";
import { formatDuration, trackNameFromFile, usedByMessage, validateTrackName } from "./library";

const inputClass = "mt-1 block min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm";
const small = "min-h-[44px] rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 disabled:opacity-40";
const UPLOAD_FAILED = "Couldn't upload the song — check the connection and try again.";
const addedOn = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function AddTrack({ createAction, onResult }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function pick(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = validateMusic(chosen);
    setError(problem);
    if (problem) {
      setFile(null);
      return;
    }
    setFile(chosen);
    if (!name.trim()) setName(trackNameFromFile(chosen.name));
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Choose an MP3 first.");
    const nameError = validateTrackName(name);
    if (nameError) return setError(nameError);
    setBusy(true);
    setError(null);
    const key = newKey(LIBRARY_PREFIX, "mp3");
    try {
      const [, durationSec] = await Promise.all([uploadMedia({ key, blob: file, contentType: "audio/mpeg" }), readDuration(file)]);
      const result = await createAction({ name: name.trim(), key, durationSec });
      if (!result?.ok) {
        await deleteMedia([key]);
        setError(result?.message ?? UPLOAD_FAILED);
        return;
      }
      setFile(null);
      setName("");
      onResult({ ok: true, message: `Added "${result.track.name}".` });
    } catch {
      await deleteMedia([key]);
      setError(UPLOAD_FAILED);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Add a song</h2>
      <p className="text-sm text-stone-600">Only upload music you have the rights to use.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className={pickerButton}>
          {file ? file.name : "Choose MP3"}
          <input type="file" accept={MUSIC_ACCEPT} aria-label="Choose an MP3" onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <label className="min-w-0 flex-1 text-sm font-medium">
          Song name
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={busy} className="min-h-[44px] rounded-full bg-stone-900 px-5 text-sm text-white disabled:opacity-60">
          {busy ? "Uploading…" : "Upload song"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

function TrackRow({ track, usedBy, renameAction, deleteAction, onResult }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(track.name);
  const [busy, setBusy] = useState(false);
  const inUse = usedBy.length > 0;

  async function rename() {
    setBusy(true);
    const result = await renameAction({ id: track.id, name });
    setBusy(false);
    if (result?.ok) setEditing(false);
    onResult(result?.ok ? { ok: true, message: "Name saved." } : { ok: false, message: result?.message ?? "Couldn't save the name." });
  }

  async function remove() {
    if (!window.confirm(`Delete "${track.name}" from the Music Library? This can't be undone.`)) return;
    setBusy(true);
    const result = await deleteAction({ id: track.id });
    setBusy(false);
    if (result?.ok) {
      if (result.key) await deleteMedia([result.key]);
      onResult({ ok: true, message: `Deleted "${track.name}".` });
    } else {
      onResult({ ok: false, message: result?.message ?? "Couldn't delete the song." });
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input aria-label={`New name for ${track.name}`} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        ) : (
          <p className="font-medium">{track.name}</p>
        )}
        <p className="text-xs text-stone-500">
          {[formatDuration(track.durationSec), `Added by ${track.createdBy}`, track.createdAt && addedOn.format(new Date(track.createdAt))].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-stone-600">{inUse ? `Used by: ${usedBy.join(", ")}` : "Not used yet"}</p>
        {inUse && <p className="text-xs text-stone-500">{usedByMessage(usedBy.length)}</p>}
      </div>
      <PlayButton src={mediaUrl(track.key)} label={track.name} />
      {editing ? (
        <>
          <button type="button" disabled={busy} onClick={rename} className={small}>
            Save name
          </button>
          <button type="button" onClick={() => (setEditing(false), setName(track.name))} className={small}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" aria-label={`Rename ${track.name}`} onClick={() => setEditing(true)} className={small}>
          Rename
        </button>
      )}
      <button type="button" aria-label={`Delete ${track.name}`} disabled={inUse || busy} onClick={remove} className={small}>
        Delete
      </button>
    </li>
  );
}

export default function MusicLibrary({ tracks, usage, createAction, renameAction, deleteAction }) {
  const [notice, setNotice] = useState(null);
  return (
    <div className="mt-6 space-y-6">
      <AddTrack createAction={createAction} onResult={setNotice} />
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`text-sm ${notice.ok ? "text-green-700" : "text-red-700"}`}>
          {notice.message}
        </p>
      )}
      {tracks.length === 0 ? (
        <p className="text-sm text-stone-600">No songs yet. Add the first one above.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-4">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} usedBy={usage[track.id] ?? []} renameAction={renameAction} deleteAction={deleteAction} onResult={setNotice} />
          ))}
        </ul>
      )}
    </div>
  );
}
