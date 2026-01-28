import type { ReactNode } from "react";

export function LeftArrowIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
      <path
        d="M10 12l-4-4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RightArrowIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoadingSpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 3L3 9v8a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9l-7-6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ButtonConfig = {
  show: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  loadingIcon?: ReactNode;
  isLoading?: boolean;
  className?: string;
};

type PracticeFooterProps = {
  leftButton?: ButtonConfig;
  rightButton?: ButtonConfig;
  title?: string;
};

function Button({ config, defaultClassName }: { config: ButtonConfig; defaultClassName: string }) {
  const { show, onClick, disabled, icon, loadingIcon, isLoading, className } = config;

  if (!show) {
    return <span className="h-11 w-11" />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className || defaultClassName}
    >
      <span className="sr-only">{isLoading && loadingIcon}</span>
      {isLoading && loadingIcon ? loadingIcon : icon}
    </button>
  );
}

export function PracticeFooter({ leftButton, rightButton, title }: PracticeFooterProps) {
  return (
    <div className="relative flex w-full items-center justify-between gap-3 py-4">
      {leftButton ? (
        <Button
          config={leftButton}
          defaultClassName="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600 text-zinc-200 transition hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      ) : (
        <span className="h-11 w-11" />
      )}

      {title && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-s text-white-500/40 select-none italic font-serif font-light tracking-wide">
            {title}
          </span>
        </div>
      )}

      {rightButton ? (
        <Button
          config={rightButton}
          defaultClassName="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
        />
      ) : (
        <span className="h-11 w-11" />
      )}
    </div>
  );
}
