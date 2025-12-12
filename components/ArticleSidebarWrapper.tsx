"use client";

import { useState, useEffect } from "react";
import { ArticleSidebarMobile } from "./ArticleSidebarMobile";
import { ArticleSidebarDesktop } from "./ArticleSidebarDesktop";
import type { ArticleCategory } from "./ArticleSidebar";

interface ArticleSidebarWrapperProps {
  categories: ArticleCategory[];
}

export function ArticleSidebarWrapper({ categories }: ArticleSidebarWrapperProps) {
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

  return isMobile ? (
    <ArticleSidebarMobile categories={categories} />
  ) : (
    <ArticleSidebarDesktop categories={categories} />
  );
}
