"use client";

import { STEPS, stepHasContent } from "./steps";

export default function StepNav({ current, content, onSelect }) {
  return (
    <nav aria-label="Editor steps">
      <ol className="flex gap-1 overflow-x-auto lg:flex-col">
        {STEPS.map((step) => {
          const active = step.number === current;
          const done = stepHasContent(step.number, content);
          return (
            <li key={step.number}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step.number)}
                className={`flex min-h-[44px] w-full items-center gap-2 whitespace-nowrap rounded-md px-3 text-left text-sm ${active ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
              >
                <span aria-hidden="true" className="w-4 text-center">
                  {done ? "✓" : ""}
                </span>
                {step.number}. {step.title}
                {done && <span className="sr-only"> (has details)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
