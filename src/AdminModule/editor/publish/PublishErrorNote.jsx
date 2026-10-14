"use client";

/**
 * A publish error. `error` is a sentence, or { message, missing } where each missing item is
 * { message, step } and links to the step that fixes it.
 */
export default function PublishErrorNote({ error, onGoToStep, className = "" }) {
  if (!error) return null;
  const { message, missing = [] } = typeof error === "string" ? { message: error } : error;
  return (
    <div role="alert" className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 ${className}`}>
      <p>{message}</p>
      {missing.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {missing.map((item) => (
            <li key={`${item.step}-${item.message}`} className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1">{item.message}</span>
              {onGoToStep ? (
                <button
                  type="button"
                  onClick={() => onGoToStep(item.step)}
                  className="min-h-[44px] rounded-full border border-current px-4 text-sm"
                >
                  Go to step {item.step}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
