"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function ArticleFooterContent() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-[760px] px-8 py-8 sm:px-12">
        <div className="flex items-center justify-between text-sm text-zinc-600">
          {/* Left section */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className=" text-zinc-900 hover:text-zinc-600 transition-colors">
              Home
            </Link>
            <span>·</span>
            <Link
              prefetch={false}
              href="/practice"
              className="hover:text-zinc-900 transition-colors"
            >
              Practice
            </Link>
            <span>·</span>
            <Link href="/feedback" className="hover:text-zinc-900 transition-colors">
              Feedback
            </Link>
          </div>
          {/* Right section */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function ArticleFooter() {
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Don't render footer on mobile
  if (isMobile) {
    return null;
  }

  return <ArticleFooterContent />;
}
