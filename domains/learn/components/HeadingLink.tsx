"use client";

import { ReactNode } from "react";

interface HeadingLinkProps {
  id: string;
  children: ReactNode;
}

export function HeadingLink({ id, children }: HeadingLinkProps) {
  return (
    <a
      href={`#${id}`}
      className="heading-anchor group/heading no-underline"
      aria-label={`Link to ${typeof children === "string" ? children : id}`}
    >
      <span className="mr-2 opacity-0 transition-opacity group-hover/heading:opacity-100 text-zinc-400">
        #
      </span>
      {children}
    </a>
  );
}
