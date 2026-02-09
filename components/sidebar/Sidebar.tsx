"use client";

import { SidebarMobile } from "./SidebarMobile";
import { SidebarDesktop } from "./SidebarDesktop";
import type { SidebarTheme, SidebarCategory, SidebarButton } from "./types";
import { useIsMobile } from "@/hooks/useIsMobile";
import articlesData from "@/domains/learn/articles.json";

/** Derive learn categories from articles.json (single source of truth) */
const articlesBySlug = Object.fromEntries(articlesData.articles.map((a) => [a.slug, a]));

const LEARN_CATEGORIES: SidebarCategory[] = articlesData.categories.map((cat) => ({
  id: cat.id,
  title: cat.title,
  icon: cat.icon,
  items: cat.articles.map((ref) => {
    const article = articlesBySlug[ref.slug];
    return {
      id: ref.id,
      title: article?.title ?? ref.slug,
      href: `/learn/${ref.slug}`,
    };
  }),
}));

/** Standalone buttons shown after the numbered categories */
const SIDEBAR_BUTTONS: SidebarButton[] = [
  { id: "practice", label: "Practice", href: "/practice", icon: "ClipboardList" },
];

const SIDEBAR_CATEGORIES: SidebarCategory[] = [...LEARN_CATEGORIES];

const LOGO = {
  href: "/",
  text: "System Design",
  short: "SD",
};

interface SidebarProps {
  theme: SidebarTheme;
}

export function Sidebar({ theme }: SidebarProps) {
  const isMobile = useIsMobile();

  const config = { theme, logo: LOGO, categories: SIDEBAR_CATEGORIES, buttons: SIDEBAR_BUTTONS };

  return isMobile ? <SidebarMobile config={config} /> : <SidebarDesktop config={config} />;
}
