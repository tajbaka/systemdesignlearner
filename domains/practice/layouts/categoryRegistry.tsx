import type { ComponentType, ReactNode } from "react";
import type { ProblemCategory } from "@/app/api/v2/practice/schemas";
import { BackendLayout } from "../back-end/layouts/BackendLayout";

export type CategoryLayoutProps = {
  children: ReactNode;
};

const CATEGORY_LAYOUTS: Record<ProblemCategory, ComponentType<CategoryLayoutProps>> = {
  backend: BackendLayout,
  frontend: () => <div>Frontend</div>, // placeholder — replace with FrontendLayout when ready
};

export function getCategoryLayout(category: ProblemCategory): ComponentType<CategoryLayoutProps> {
  return CATEGORY_LAYOUTS[category] ?? BackendLayout;
}
