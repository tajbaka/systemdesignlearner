/**
 * React Hook for Scoring System
 *
 * Provides easy access to scoring functionality from React components.
 */

import { useState, useEffect, useCallback } from "react";
import type {
  ProblemScoringConfig,
  FeedbackResult,
  FunctionalScoringInput,
  NonFunctionalScoringInput,
  ApiScoringInput,
  DesignScoringInput,
  SimulationScoringInput,
  CumulativeScore,
} from "./types";
import {
  loadScoringConfig,
  scoreFunctionalRequirements,
  scoreNonFunctionalRequirements,
  scoreApiDefinition,
  scoreDesign,
  scoreSimulation,
  calculateCumulativeScore,
} from "./index";

export type ScoringState = {
  config: ProblemScoringConfig | null;
  loading: boolean;
  error: Error | null;
  results: {
    functional: FeedbackResult | null;
    nonFunctional: FeedbackResult | null;
    api: FeedbackResult | null;
    design: FeedbackResult | null;
    simulation: FeedbackResult | null;
  };
  cumulative: CumulativeScore | null;
};

/**
 * Hook to load and use scoring configuration
 */
export function useScoring(problemId: string) {
  const [state, setState] = useState<ScoringState>({
    config: null,
    loading: true,
    error: null,
    results: {
      functional: null,
      nonFunctional: null,
      api: null,
      design: null,
      simulation: null,
    },
    cumulative: null,
  });

  // Load configuration
  useEffect(() => {
    let mounted = true;

    loadScoringConfig(problemId)
      .then((config) => {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            config,
            loading: false,
          }));
        }
      })
      .catch((error) => {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: error as Error,
            loading: false,
          }));
        }
      });

    return () => {
      mounted = false;
    };
  }, [problemId]);

  // Evaluate functional requirements
  const evaluateFunctional = useCallback(
    (input: FunctionalScoringInput): FeedbackResult | null => {
      if (!state.config) return null;

      const result = scoreFunctionalRequirements(input, state.config);
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, functional: result },
      }));

      return result;
    },
    [state.config]
  );

  // Evaluate non-functional requirements
  const evaluateNonFunctional = useCallback(
    (input: NonFunctionalScoringInput): FeedbackResult | null => {
      if (!state.config) return null;

      const result = scoreNonFunctionalRequirements(input, state.config);
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, nonFunctional: result },
      }));

      return result;
    },
    [state.config]
  );

  // Evaluate API definition
  const evaluateApi = useCallback(
    (input: ApiScoringInput): FeedbackResult | null => {
      if (!state.config) return null;

      const result = scoreApiDefinition(input, state.config);
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, api: result },
      }));

      return result;
    },
    [state.config]
  );

  // Evaluate design
  const evaluateDesignStep = useCallback(
    (input: DesignScoringInput): FeedbackResult | null => {
      if (!state.config) return null;

      const result = scoreDesign(input, state.config);
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, design: result },
      }));

      return result;
    },
    [state.config]
  );

  // Evaluate simulation
  const evaluateSimulationStep = useCallback(
    (input: SimulationScoringInput): FeedbackResult | null => {
      if (!state.config) return null;

      const result = scoreSimulation(input, state.config);
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, simulation: result },
      }));

      return result;
    },
    [state.config]
  );

  // Calculate cumulative score
  const calculateCumulative = useCallback(() => {
    const { functional, nonFunctional, api, design, simulation } = state.results;

    // Need all results except simulation (optional)
    if (!functional || !nonFunctional || !api || !design) {
      return null;
    }

    const simulationResult = simulation || {
      score: 0,
      maxScore: state.config?.steps.simulation.maxScore || 5,
      percentage: 0,
      blocking: [],
      warnings: [],
      positive: [],
      suggestions: [],
    };

    const cumulative = calculateCumulativeScore(
      functional,
      nonFunctional,
      api,
      design,
      simulationResult
    );

    setState((prev) => ({
      ...prev,
      cumulative,
    }));

    return cumulative;
  }, [state.results, state.config]);

  return {
    config: state.config,
    loading: state.loading,
    error: state.error,
    results: state.results,
    cumulative: state.cumulative,
    evaluateFunctional,
    evaluateNonFunctional,
    evaluateApi,
    evaluateDesign: evaluateDesignStep,
    evaluateSimulation: evaluateSimulationStep,
    calculateCumulative,
  };
}

/**
 * Hook for a single step evaluation
 */
export function useStepScoring<TInput>(
  problemId: string,
  step: "functional" | "nonFunctional" | "api" | "design" | "simulation",
  input: TInput | null,
  autoEvaluate = false
) {
  const { config, evaluateFunctional, evaluateNonFunctional, evaluateApi, evaluateDesign, evaluateSimulation } =
    useScoring(problemId);

  const [result, setResult] = useState<FeedbackResult | null>(null);

  const evaluate = useCallback(() => {
    if (!input || !config) return null;

    let newResult: FeedbackResult | null = null;

    switch (step) {
      case "functional":
        newResult = evaluateFunctional(input as FunctionalScoringInput);
        break;
      case "nonFunctional":
        newResult = evaluateNonFunctional(input as NonFunctionalScoringInput);
        break;
      case "api":
        newResult = evaluateApi(input as ApiScoringInput);
        break;
      case "design":
        newResult = evaluateDesign(input as DesignScoringInput);
        break;
      case "simulation":
        newResult = evaluateSimulation(input as SimulationScoringInput);
        break;
    }

    setResult(newResult);
    return newResult;
  }, [input, config, step, evaluateFunctional, evaluateNonFunctional, evaluateApi, evaluateDesign, evaluateSimulation]);

  // Auto-evaluate when input changes
  useEffect(() => {
    if (autoEvaluate && input && config) {
      evaluate();
    }
  }, [autoEvaluate, input, config, evaluate]);

  return {
    result,
    evaluate,
    canProceed: result ? result.blocking.length === 0 : false,
    hasWarnings: result ? result.warnings.length > 0 : false,
    score: result?.score || 0,
    percentage: result?.percentage || 0,
  };
}
