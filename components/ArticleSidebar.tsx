import { LucideIcon, BookOpen, FileQuestion } from "lucide-react";

export interface ArticleCategory {
  id: string;
  title: string;
  icon?: string; // icon name from lucide-react
  articles: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
}

// Map icon names to Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  FileQuestion,
};

export function getCategoryIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

// Re-export components for convenience
export { ArticleSidebarMobile } from "./ArticleSidebarMobile";
export { ArticleSidebarDesktop } from "./ArticleSidebarDesktop";
