"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export type MasteryLevel = "Junior" | "Senior" | "Staff Architect";

export interface ReadinessData {
  percentage: number;
  completedSteps: number;
  totalSteps: number;
  masteryLevel: MasteryLevel;
}

export function getMasteryLevel(percentage: number): MasteryLevel {
  if (percentage >= 75) return "Staff Architect";
  if (percentage >= 40) return "Senior";
  return "Junior";
}

export function useReadiness() {
  const { isSignedIn } = useUser();
  const [data, setData] = useState<ReadinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      setData(null);
      return;
    }

    let cancelled = false;

    async function fetchReadiness() {
      try {
        const res = await fetch("/api/v2/practice");
        if (!res.ok) {
          setData(null);
          return;
        }

        const json = await res.json();
        const problems: { totalSteps: number | null; completedSteps: number | null }[] =
          json.data ?? [];

        let totalSteps = 0;
        let completedSteps = 0;

        for (const p of problems) {
          if (p.totalSteps != null) {
            totalSteps += p.totalSteps;
          }
          if (p.completedSteps != null) {
            completedSteps += p.completedSteps;
          }
        }

        if (cancelled) return;

        if (completedSteps === 0 || totalSteps === 0) {
          setData(null);
        } else {
          const percentage = Math.round((completedSteps / totalSteps) * 100);
          setData({
            percentage,
            completedSteps,
            totalSteps,
            masteryLevel: getMasteryLevel(percentage),
          });
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchReadiness();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return { data, isLoading };
}
