import type { LucideIcon } from "lucide-react";

export type SidebarTheme = "light" | "dark";

export interface SidebarCategory {
  id: string;
  title: string;
  icon?: string | LucideIcon;
  href?: string;
  items: Array<{
    id: string;
    title: string;
    href: string;
  }>;
}

/** A standalone navigation button (not a numbered category) */
export interface SidebarButton {
  id: string;
  label: string;
  href: string;
  icon?: string | LucideIcon;
}

/** Internal config passed from Sidebar to Desktop/Mobile sub-components */
export interface SidebarInternalConfig {
  theme: SidebarTheme;
  logo: {
    href: string;
    text: string;
    short: string;
  };
  categories: SidebarCategory[];
  buttons?: SidebarButton[];
}
