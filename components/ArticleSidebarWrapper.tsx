"use client";

import { ArticleSidebarMobile } from "./ArticleSidebarMobile";
import { ArticleSidebarDesktop } from "./ArticleSidebarDesktop";
import type { ArticleCategory } from "./ArticleSidebar";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ArticleSidebarWrapperProps {
  categories: ArticleCategory[];
}

export function ArticleSidebarWrapper({ categories }: ArticleSidebarWrapperProps) {
  const isMobile = useIsMobile();

  return isMobile ? (
    <ArticleSidebarMobile categories={categories} />
  ) : (
    <ArticleSidebarDesktop categories={categories} />
  );
}
