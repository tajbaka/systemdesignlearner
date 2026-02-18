"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type StepArticle = {
  title: string;
  href: string;
};

export type StepTooltipProps = {
  title: string;
  description: string;
  learnMoreLink?: string;
  articles?: StepArticle[];
  open?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onClickOutside?: () => void;
};

export function StepTooltip({
  title,
  description,
  learnMoreLink,
  articles,
  open,
  onClick,
  onClickOutside,
}: StepTooltipProps) {
  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${
            open
              ? "border-blue-400/60 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/80"
              : "border-zinc-600/60 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-zinc-500/60"
          }`}
          aria-label="Step information"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M6.2 6.2a2 2 0 0 1 3.5 1.1c0 1.2-1.7 1.2-1.7 2.2M8 11.5h.01" />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="rounded-lg border-2 border-blue-500 bg-blue-600 text-white shadow-xl max-w-xs px-4 py-3"
        sideOffset={8}
        onPointerDownOutside={(e) => {
          // Don't close if clicking on the trigger button itself
          const target = e.target as HTMLElement;
          if (target.closest('button[aria-label="Step information"]')) {
            e.preventDefault();
            return;
          }
          onClickOutside?.();
        }}
      >
        <h3 className="text-sm font-bold mb-1.5">{title}</h3>
        <p className="text-sm mb-2">{description}</p>
        {learnMoreLink && (
          <Link
            href={learnMoreLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100 hover:text-white underline transition-colors"
          >
            Learn more
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </Link>
        )}
        {articles && articles.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-blue-400/30">
            <h4 className="text-xs font-semibold mb-1.5 text-blue-100">Articles for this step:</h4>
            <ul className="space-y-1">
              {articles.map((article) => (
                <li key={article.href}>
                  <Link
                    href={article.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-100 hover:text-white underline transition-colors"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
