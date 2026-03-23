"use client";

import { ReactNode, useRef, useState } from "react";

interface CopyCodeBlockProps {
  children: ReactNode;
}

export function CopyCodeBlock({ children }: CopyCodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = preRef.current?.textContent ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper group/code relative">
      <pre ref={preRef}>{children}</pre>
      <button
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-3 top-3 rounded-md border border-zinc-300 bg-white/80 px-2 py-1 text-xs text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-100 group-hover/code:opacity-100"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
