"use client";

import type { HttpMethod } from "./MethodSelect";

interface ItemCardProps {
  method: HttpMethod;
  path: string;
  notes: string; // Keep as "notes" for compatibility with parent components
  onClick: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

export function ItemCard({
  method,
  path,
  notes,
  onClick,
  onDelete,
  disabled = false,
}: ItemCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`w-full text-left rounded-2xl border p-4 transition active:scale-[0.98] border-zinc-700 bg-zinc-900/70 cursor-pointer ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 items-center justify-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
          {method}
        </span>
        <span className="flex-1 text-sm text-zinc-200 font-mono">
          /{path || <span className="text-zinc-500 italic">new-endpoint</span>}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-red-400 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label="Delete endpoint"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          disabled={disabled}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-blue-400 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Edit endpoint"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Notes preview */}
      {notes && notes.trim().length > 0 && (
        <p className="mt-2 text-xs line-clamp-2 text-zinc-400">
          {notes.slice(0, 1).toUpperCase() + notes.slice(1).toLowerCase()}
        </p>
      )}
    </div>
  );
}
