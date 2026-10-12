import { remove, uploadData } from "aws-amplify/storage";

/** Uploads straight from the browser to S3 with the signed-in staff member's credentials. */
export async function uploadMedia({ key, blob, contentType, onProgress }) {
  await uploadData({
    path: key,
    data: blob,
    options: {
      contentType,
      onProgress: ({ transferredBytes, totalBytes }) => onProgress?.(totalBytes ? transferredBytes / totalBytes : 0),
    },
  }).result;
  return key;
}

/** Best effort: a file that can't be deleted stays until the invitation's folder is purged (Phase 5). */
export async function deleteMedia(keys) {
  const results = await Promise.allSettled(keys.map((path) => remove({ path })));
  results.forEach((outcome, i) => {
    if (outcome.status === "rejected") console.warn("Couldn't delete", keys[i], outcome.reason);
  });
}
