"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

interface PracticeNowButtonProps {
  slug: string;
}

export function PracticeNowButton({ slug }: PracticeNowButtonProps) {
  return (
    <Link
      prefetch={false}
      href="/practice"
      onClick={() => {
        track("article_practice_clicked", { slug });
      }}
      className="inline-flex items-center justify-center h-12 rounded-md px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base transition-all no-underline hover:no-underline"
    >
      Practice Now
    </Link>
  );
}
