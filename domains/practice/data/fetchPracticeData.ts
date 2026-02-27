import { cache } from "react";
import type { ProblemResponse, ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";
import { getBaseUrl } from "@/lib/getBaseUrl";

/**
 * React.cache()-wrapped fetchers for practice data.
 * Within a single server render pass, duplicate calls (same slug + cookies)
 * are automatically deduplicated so layout.tsx and page.tsx don't double-fetch.
 */

export const fetchProblem = cache(
  async (slug: string, cookieHeader: string): Promise<ProblemResponse | null> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v2/practice/${slug}`, {
      next: { revalidate: 60 * 5 },
      headers: { Cookie: cookieHeader },
    });

    if (response.ok) {
      const data = await response.json();
      return (data?.data ?? null) as ProblemResponse | null;
    }
    return null;
  }
);

export const fetchSteps = cache(
  async (slug: string, cookieHeader: string): Promise<ProblemStepWithUserStep[] | null> => {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/v2/practice/${slug}/steps`, {
      cache: "no-store",
      headers: { Cookie: cookieHeader },
    });

    if (response.ok) {
      const data = await response.json();
      return (data?.data ?? null) as ProblemStepWithUserStep[] | null;
    }
    return null;
  }
);
