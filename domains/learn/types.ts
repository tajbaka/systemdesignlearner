/**
 * Learn Domain Types
 *
 * Type definitions for the learn/article system
 */

export interface ArticleConfig {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  date: string;
  readTime: string;
  markdownFile: string;
  removeFirstHeading?: boolean;
  keywords?: string[];
  tableOfContents: Array<{ id: string; title: string }>;
}

export interface ArticlesData {
  categories: Array<{
    id: string;
    title: string;
    icon?: string;
    articles: Array<{ id: string; slug: string }>;
  }>;
  articles: ArticleConfig[];
}

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
