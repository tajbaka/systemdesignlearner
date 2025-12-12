"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't scroll to top on article pages (pages using ArticleLayout)
    if (pathname?.startsWith("/learn/")) {
      return;
    }

    // Scroll to top immediately on mount and pathname change
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
