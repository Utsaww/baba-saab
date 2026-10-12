"use client";

const small = "min-h-[44px] rounded-full border border-stone-300 px-3 text-xs hover:bg-stone-100";

/** Progress bars for uploads in progress, and Retry / Dismiss for failed ones. */
export default function UploadStatus({ items, uploads, canRetry = true }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="text-xs">
          {item.status === "uploading" ? (
            <div>
              <span className="text-stone-600">Uploading {item.label}…</span>
              <div role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)} className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-stone-800" style={{ width: `${Math.round(item.progress * 100)}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-red-700">
              <span role="alert">
                {item.label}: {item.error}
              </span>
              {canRetry && (
                <button type="button" onClick={() => uploads.retry(item.id)} className={small}>
                  Retry
                </button>
              )}
              <button type="button" onClick={() => uploads.dismiss(item.id)} className={small}>
                Dismiss
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
