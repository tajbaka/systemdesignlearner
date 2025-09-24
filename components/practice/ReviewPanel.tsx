"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { encodeDesign } from "@/lib/practice/encoder";
import { toMarkdown } from "@/lib/practice/brief";
import type { PracticeState } from "@/lib/practice/types";

type ReviewPanelProps = {
  state: PracticeState;
  sandboxAvailable?: boolean;
  onExport?: () => void;
  onOpenSandbox?: () => void;
};

export const ReviewPanel = ({ state, sandboxAvailable = false, onExport, onOpenSandbox }: ReviewPanelProps) => {
  const router = useRouter();
  const markdown = useMemo(() => toMarkdown(state), [state]);
  const canDeepLink = sandboxAvailable && state.high;

  const handleExport = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.slug}-design.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onExport?.();
  };

  const handleOpenSandbox = () => {
    if (!canDeepLink || !state.high) {
      return;
    }
    const deepLink = `/play#d=${encodeDesign(state.high)}`;
    onOpenSandbox?.();
    router.push(deepLink);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Design brief</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Review the generated Markdown. Export it for your notes or validate it in the sandbox.
          </p>
        </header>
        <pre className="max-h-[60vh] overflow-y-auto rounded-lg bg-zinc-950/5 p-4 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          {markdown}
        </pre>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-semibold text-zinc-800 transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:text-zinc-100"
        >
          Export .md
        </button>
        <button
          type="button"
          onClick={handleOpenSandbox}
          disabled={!canDeepLink}
          className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Validate in Sandbox
        </button>
      </div>
    </div>
  );
};

export default ReviewPanel;
