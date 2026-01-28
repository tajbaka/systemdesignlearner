"use client";

interface AddItemButtonProps {
  onAddItem: () => void;
  disabled?: boolean;
}

export function AddItemButton({ onAddItem, disabled = false }: AddItemButtonProps) {
  return (
    <>
      {/* Desktop layout */}
      <div className="hidden sm:block">
        {!disabled && (
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-4 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add item
          </button>
        )}
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden">
        {!disabled && (
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-4 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            + Add item
          </button>
        )}
      </div>
    </>
  );
}
