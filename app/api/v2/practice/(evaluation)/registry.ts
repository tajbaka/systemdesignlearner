import { functionalStrategy } from "./strategies/functional";
import { nonFunctionalStrategy } from "./strategies/non-functional";
import { apiStrategy } from "./strategies/api";
import { highLevelDesignStrategy } from "./strategies/high-level-design";
import type { EvaluationStrategy } from "./types";

// We use 'any' here because different strategies have different input types,
// but the flow (validate -> buildPrompt) is consistent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EVALUATION_STRATEGIES: Record<string, EvaluationStrategy<any>> = {
  functional: functionalStrategy,
  nonFunctional: nonFunctionalStrategy,
  api: apiStrategy,
  highLevelDesign: highLevelDesignStrategy,
};
