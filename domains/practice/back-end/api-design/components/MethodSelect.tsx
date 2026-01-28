"use client";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

const METHOD_OPTIONS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

interface MethodSelectProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
  disabled?: boolean;
  shouldHighlight?: boolean;
  highlightColor?: "red" | "yellow";
}

export function MethodSelect({
  value,
  onChange,
  disabled = false,
  shouldHighlight = false,
  highlightColor = "yellow",
}: MethodSelectProps) {
  const getBorderClass = () => {
    if (!shouldHighlight) return "border border-zinc-700";
    switch (highlightColor) {
      case "red":
        return "border border-red-400/50 bg-red-950/20 ring-2 ring-red-400/30";
      case "yellow":
        return "border border-amber-400/50 bg-amber-950/20 ring-2 ring-amber-400/30";
    }
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as HttpMethod)}
        disabled={disabled}
        className={`h-10 w-full rounded-full ${getBorderClass()} bg-zinc-900 pl-3 pr-10 text-xs font-semibold uppercase tracking-wide text-zinc-100 transition-all duration-300 focus:border-blue-500 focus:bg-zinc-900 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 appearance-none`}
      >
        {METHOD_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="h-4 w-4 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
