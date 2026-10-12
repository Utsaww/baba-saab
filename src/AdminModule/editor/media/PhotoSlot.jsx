"use client";

import { useRef, useState } from "react";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { newKey, PHOTO_ACCEPT, validatePhoto } from "@/AdminModule/media/files";
import { createLimiter } from "@/AdminModule/media/limit";
import { preparePhoto } from "@/AdminModule/media/photos";
import { uploadMedia } from "@/AdminModule/media/storage";
import UploadStatus from "./UploadStatus";

export const pickerButton =
  "relative inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 focus-within:ring-2 focus-within:ring-stone-400";

// Decoding a full-size photo is memory-hungry, so phones only prepare two at a time (uploads still run in parallel).
const prepareLimited = createLimiter(2);

/** One upload job: compress (and convert iPhone photos), then upload into the invitation's folder. */
export function photoJob({ file, folder, group, onDone }) {
  return {
    label: file.name,
    group,
    onDone,
    run: async (onProgress) => {
      const blob = await prepareLimited(() => preparePhoto(file));
      return uploadMedia({ key: newKey(folder, "jpg"), blob, contentType: "image/jpeg", onProgress });
    },
  };
}

export default function PhotoSlot({ label, group, value, onChange, folder, uploads }) {
  const [error, setError] = useState(null);
  const items = uploads.items.filter((item) => item.group === group);
  // Only the newest pick may fill the slot; Remove invalidates anything still uploading.
  const latest = useRef(0);

  function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validatePhoto(file);
    setError(problem);
    if (problem) return;
    const token = ++latest.current;
    uploads.start(photoJob({ file, folder, group, onDone: (key) => latest.current === token && onChange(key) }));
  }

  function remove() {
    if (!window.confirm("Remove this photo? This can't be undone.")) return;
    latest.current += 1;
    items.forEach((item) => uploads.dismiss(item.id));
    onChange(undefined);
  }

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {value ? (
          <img src={mediaUrl(value)} alt="" className="h-24 w-24 rounded-lg border border-stone-200 object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-400">No photo</div>
        )}
        <label className={pickerButton}>
          {value ? "Replace" : "Upload"}
          <input type="file" accept={PHOTO_ACCEPT} aria-label={`Choose ${label.toLowerCase()}`} onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        {value && (
          <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={remove} className={pickerButton}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      <UploadStatus items={items} uploads={uploads} />
    </div>
  );
}
