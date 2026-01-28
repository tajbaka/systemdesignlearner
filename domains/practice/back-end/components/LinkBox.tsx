"use client";

import { ExternalLink } from "lucide-react";

type LinkBoxProps = {
  title: string;
  onClick: (e: React.MouseEvent) => void;
};

export function LinkBox({ title, onClick }: LinkBoxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/50 transition-all cursor-pointer"
    >
      {title}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
