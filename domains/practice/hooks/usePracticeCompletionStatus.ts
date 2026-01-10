"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { getCompletedScenarioSlugs } from "@/domains/practice/actions/practice";
import { SCENARIOS } from "@/domains/practice/scenarios";

export function usePracticeCompletionStatus() {
  const { isSignedIn, isLoaded } = useAuth();
  const [completedProblems, setCompletedProblems] = useState<Set<string>>(new Set());

  // Check localStorage for completion status (for anonymous users or as fallback)
  const checkLocalStorageCompletions = useCallback(() => {
    const completed = new Set<string>();
    SCENARIOS.forEach((scenario) => {
      const storageKey = `sds-practice-${scenario.id}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          // Check if the score step is completed (using 'completed' not 'progress')
          if (data.completed?.score === true) {
            completed.add(scenario.id);
          }
        }
      } catch (_e) {
        // Ignore parsing errors
      }
    });
    return completed;
  }, []);

  // Check database for completion status (for authenticated users)
  const checkDbCompletions = useCallback(async () => {
    try {
      const slugs = await getCompletedScenarioSlugs();
      return new Set(slugs);
    } catch (error) {
      console.error("Failed to fetch completed scenarios from DB", error);
      return new Set<string>();
    }
  }, []);

  // Combined check that uses both sources
  const checkCompletionStatus = useCallback(async () => {
    // Always check localStorage first (fast)
    const localCompleted = checkLocalStorageCompletions();

    if (isSignedIn) {
      // For authenticated users, also check DB and merge
      const dbCompleted = await checkDbCompletions();
      // Merge both sources (union)
      const merged = new Set([...localCompleted, ...dbCompleted]);
      setCompletedProblems(merged);
    } else {
      setCompletedProblems(localCompleted);
    }
  }, [isSignedIn, checkLocalStorageCompletions, checkDbCompletions]);

  useEffect(() => {
    // Wait for auth to load before checking
    if (!isLoaded) return;

    // Initial check
    checkCompletionStatus();

    // Listen for storage changes and focus events (when returning to the page)
    const handleStorageOrFocus = () => {
      checkCompletionStatus();
    };

    window.addEventListener("storage", handleStorageOrFocus);
    window.addEventListener("focus", handleStorageOrFocus);

    return () => {
      window.removeEventListener("storage", handleStorageOrFocus);
      window.removeEventListener("focus", handleStorageOrFocus);
    };
  }, [isLoaded, checkCompletionStatus]);

  return {
    completedProblems,
    isLoading: !isLoaded,
    refreshCompletionStatus: checkCompletionStatus,
  };
}
