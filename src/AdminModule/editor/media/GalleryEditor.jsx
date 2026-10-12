"use client";

import { useState } from "react";
import { GALLERY_MAX } from "@/InvitationModule/schema/invitation";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { PHOTO_ACCEPT, validatePhoto } from "@/AdminModule/media/files";
import { LocalisedInput } from "../fields";
import { photoJob, pickerButton } from "./PhotoSlot";
import UploadStatus from "./UploadStatus";

const small = "min-h-[44px] rounded-full border border-stone-300 px-3 text-sm hover:bg-stone-100 disabled:opacity-40";
const GALLERY = ["media", "gallery"];

function moved(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function GalleryEditor({ gallery = [], update, folder, uploads, language }) {
  const [problems, setProblems] = useState([]);
  const items = uploads.items.filter((item) => item.group === "gallery");
  const uploading = items.filter((item) => item.status === "uploading").length;
  const room = Math.max(0, GALLERY_MAX - gallery.length - uploading);
  const full = gallery.length >= GALLERY_MAX;

  function pick(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    const found = [];
    const accepted = [];
    for (const file of files) {
      const problem = validatePhoto(file);
      if (problem) found.push(`${file.name}: ${problem}`);
      else accepted.push(file);
    }
    const allowed = accepted.slice(0, room);
    if (accepted.length > allowed.length) {
      found.push(`The gallery holds up to ${GALLERY_MAX} photos — ${accepted.length - allowed.length} not added.`);
    }
    setProblems(found);
    for (const file of allowed) {
      uploads.start(photoJob({ file, folder, group: "gallery", onDone: (key) => update(GALLERY, (current = []) => [...current, { key }]) }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${pickerButton} ${full ? "pointer-events-none opacity-40" : ""}`}>
          Add photos
          <input type="file" multiple accept={PHOTO_ACCEPT} aria-label="Add gallery photos" disabled={full} onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <span className="text-sm text-stone-600">{full ? `${GALLERY_MAX} of ${GALLERY_MAX} — the gallery is full` : `${gallery.length} of ${GALLERY_MAX}`}</span>
      </div>
      {problems.length > 0 && (
        <div role="alert" className="space-y-1 text-xs text-red-700">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      )}
      <UploadStatus items={items} uploads={uploads} />
      <ol className="grid gap-4 sm:grid-cols-2">
        {gallery.map((photo, i) => (
          <li key={photo.key} className="space-y-2 rounded-xl border border-stone-200 p-3">
            <img src={mediaUrl(photo.key)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
            <LocalisedInput
              label={`Caption for photo ${i + 1}`}
              value={photo.caption}
              language={language}
              onChange={(caption) => update([...GALLERY, i, "caption"], caption)}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={i === 0} aria-label={`Move photo ${i + 1} left`} onClick={() => update(GALLERY, (current = []) => moved(current, i, i - 1))} className={small}>
                ←
              </button>
              <button type="button" disabled={i === gallery.length - 1} aria-label={`Move photo ${i + 1} right`} onClick={() => update(GALLERY, (current = []) => moved(current, i, i + 1))} className={small}>
                →
              </button>
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => {
                  if (window.confirm("Remove this photo? This can't be undone.")) update(GALLERY, (current = []) => current.filter((_, j) => j !== i));
                }}
                className={small}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
