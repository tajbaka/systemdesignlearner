import type { PracticeState } from "@/domains/practice/types";
import { logger } from "@/lib/logger";

const storageKey = (slug: PracticeState["slug"]) => `sds-practice-${slug}`;

export const loadPractice = (
  slug: PracticeState["slug"]
): PracticeState | Record<string, unknown> | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PracticeState | Record<string, unknown>;
    return (parsed as PracticeState)?.slug === slug ? parsed : null;
  } catch (err) {
    logger.warn("Failed to load practice state", err);
    return null;
  }
};

export const savePractice = (state: PracticeState): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(state.slug), JSON.stringify(state));
  } catch (err) {
    logger.warn("Failed to persist practice state", err);
  }
};
