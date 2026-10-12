"use client";

import { useState } from "react";
import { mediaUrl } from "@/InvitationModule/lib/media";
import { newKey, PHOTO_ACCEPT, validatePhoto } from "@/AdminModule/media/files";
import { preparePhoto } from "@/AdminModule/media/photos";
import { uploadMedia } from "@/AdminModule/media/storage";
import UploadStatus from "./UploadStatus";

export const pickerButton =
  "relative inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-stone-300 px-4 text-sm hover:bg-stone-100 focus-within:ring-2 focus-within:ring-stone-400";

/** One upload job: compress (and convert iPhone photos), then upload into the invitation's folder. */
export function photoJob({ file, folder, group, onDone }) {
  return {
    label: file.name,
    group,
    onDone,
    run: async (onProgress) => {
      const blob = await preparePhoto(file);
      return uploadMedia({ key: newKey(folder, "jpg"), blob, contentType: "image/jpeg", onProgress });
    },
  };
}

export default function PhotoSlot({ label, group, value, onChange, folder, uploads }) {
  const [error, setError] = useState(null);
  const items = uploads.items.filter((item) => item.group === group);

  function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validatePhoto(file);
    setError(problem);
    if (!problem) uploads.start(photoJob({ file, folder, group, onDone: onChange }));
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
          <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange(undefined)} className={pickerButton}>
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
