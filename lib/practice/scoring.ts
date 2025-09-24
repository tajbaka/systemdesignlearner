import type { PracticeState } from "./types";

export interface PracticeScoreBreakdown {
  sloScore: number; // 60% - based on requirements alignment and architecture suitability
  checklistScore: number; // 30% - based on functional requirements coverage
  costScore: number; // 10% - based on design efficiency
  totalScore: number;
  outcome: "pass" | "partial" | "fail";
  hints: string[];
}

export function scorePractice(state: PracticeState): PracticeScoreBreakdown {
  let sloScore = 0;
  let checklistScore = 0;
  let costScore = 0;
  const hints: string[] = [];

  // SLO Score (60 points max) - Architecture suitability for requirements
  if (state.requirements && state.high) {
    const { nonFunctional } = state.requirements;
    const { components, presetId } = state.high;

    // Cache-first architecture is ideal for high read RPS with strict latency
    if (presetId === "cache_primary") {
      sloScore += 40; // Strong alignment
    } else if (presetId === "global_edge_cache") {
      sloScore += 30; // Good for latency but complex
    } else {
      sloScore += 10; // DB-only not suitable for these requirements
      hints.push("Consider adding cache before DB for redirect hot-path");
    }

    // Check if architecture can handle the throughput
    if ((nonFunctional.readRps || 0) > 1000 && !components.some(c => c.includes("Cache"))) {
      hints.push("High read throughput needs caching layer");
    }

    // Latency budget assessment
    if ((nonFunctional.p95RedirectMs || 0) < 200 && !components.some(c => c.includes("Cache"))) {
      hints.push("Strict latency budget requires in-memory cache");
    }

    // Availability alignment
    if (nonFunctional.availability === "99.9" && components.length < 3) {
      hints.push("Higher availability targets need more resilient architecture");
    }
  }

  // Checklist Score (30 points max) - Functional requirements coverage
  if (state.requirements) {
    const { functional } = state.requirements;
    const requiredFeatures = ["create-short-url", "redirect-by-slug"];
    const implementedRequired = requiredFeatures.filter(f => functional[f]);

    // Must have core features
    if (implementedRequired.length === requiredFeatures.length) {
      checklistScore += 20; // Core functionality covered
    } else {
      hints.push("Core URL shortener functionality must be implemented");
    }

    // Bonus for additional features
    const optionalFeatures = Object.keys(functional).filter(f => !requiredFeatures.includes(f));
    const implementedOptional = optionalFeatures.filter(f => functional[f]);
    checklistScore += (implementedOptional.length / optionalFeatures.length) * 10;
  }

  // Cost Score (10 points max) - Design efficiency
  if (state.high && state.low) {
    const { components } = state.high;
    const { capacityAssumptions } = state.low;

    // Penalize over-engineering
    if (components.length > 4 && (state.requirements?.nonFunctional.readRps || 0) < 1000) {
      costScore += 3; // Some penalty for unnecessary complexity
      hints.push("Consider simpler architecture for lower throughput");
    } else {
      costScore += 7; // Efficient design
    }

    // Capacity planning bonus
    const { cacheHit, readRps } = capacityAssumptions;
    if (cacheHit >= 90 && readRps > 0) {
      costScore += 3; // Good capacity planning
    } else if (cacheHit < 80) {
      hints.push("Low cache hit rate may increase DB load and costs");
    }
  }

  // Ensure scores don't exceed maximums
  sloScore = Math.min(60, Math.max(0, sloScore));
  checklistScore = Math.min(30, Math.max(0, checklistScore));
  costScore = Math.min(10, Math.max(0, costScore));

  const totalScore = Math.round(sloScore + checklistScore + costScore);

  // Determine outcome
  let outcome: PracticeScoreBreakdown["outcome"];
  if (totalScore >= 80 && sloScore >= 40) {
    outcome = "pass";
  } else if (totalScore >= 50 || sloScore >= 20) {
    outcome = "partial";
  } else {
    outcome = "fail";
  }

  // Add contextual hints based on failures
  if (outcome === "fail" || outcome === "partial") {
    if (!state.high?.components.some(c => c.includes("Cache"))) {
      hints.push("Add Redis cache to handle redirect traffic efficiently");
    }
    if ((state.requirements?.nonFunctional.p95RedirectMs || 0) < 100 && !hints.some(h => h.includes("latency"))) {
      hints.push("Consider edge caching or CDN for sub-100ms latency targets");
    }
    if ((state.low?.capacityAssumptions.cacheHit || 0) < 85) {
      hints.push("Implement cache warming or longer TTL policies");
    }
  }

  return {
    sloScore: Math.round(sloScore),
    checklistScore: Math.round(checklistScore),
    costScore: Math.round(costScore),
    totalScore,
    outcome,
    hints: [...new Set(hints)] // Remove duplicates
  };
}
