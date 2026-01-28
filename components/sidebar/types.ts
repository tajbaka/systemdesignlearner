import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarTheme = "light" | "dark";

export interface SidebarLink {
  href: string;
  label: string;
  icon?: ReactNode;
}

export interface SidebarCategory {
  id: string;
  title: string;
  icon?: string | LucideIcon;
  items: Array<{
    id: string;
    title: string;
    href: string;
  }>;
}

export interface SidebarConfig {
  theme: SidebarTheme;
  logo: {
    href: string;
    text: string;
    short: string;
  };
  // For simple navigation (practice mode)
  links?: SidebarLink[];
  // For nested navigation (learn mode)
  categories?: SidebarCategory[];
}
