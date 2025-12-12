export interface ArticleCategory {
  id: string;
  title: string;
  icon?: string; // emoji or icon
  articles: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
}

// Re-export components for convenience
export { ArticleSidebarMobile } from "./ArticleSidebarMobile";
export { ArticleSidebarDesktop } from "./ArticleSidebarDesktop";
