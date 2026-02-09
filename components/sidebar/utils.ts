import { LucideIcon, BookOpen, FileQuestion, ClipboardList } from "lucide-react";

// Map icon names to Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  FileQuestion,
  ClipboardList,
};

export function getCategoryIcon(iconName?: string | LucideIcon): LucideIcon | null {
  if (!iconName) return null;
  if (typeof iconName === "function") return iconName as LucideIcon;
  return iconMap[iconName] || null;
}
