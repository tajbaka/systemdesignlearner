"use client";

interface PathInputProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
  shouldHighlight?: boolean;
  highlightColor?: "red" | "yellow";
}

export function PathInput({
  value,
  onChange,
  disabled = false,
  shouldHighlight = false,
  highlightColor = "yellow",
}: PathInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let pathValue = event.target.value;
    // Remove any leading slashes
    pathValue = pathValue.replace(/^\/+/, "");
    onChange(pathValue);
  };

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
    <div className="relative h-10 min-w-[160px] flex-1">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-100 pointer-events-none">
        /
      </span>
      <input
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`h-10 w-full rounded-full ${getBorderClass()} bg-zinc-900 pl-6 pr-4 text-sm text-zinc-100 transition-all duration-300 focus:border-blue-500 focus:bg-zinc-900 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60`}
      />
    </div>
  );
}
