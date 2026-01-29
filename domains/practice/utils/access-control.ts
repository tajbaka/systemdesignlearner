/**
 * Shared utility for calculating step access control across the application.
 * Ensures sequential completion - users must complete steps in order.
 */

/**
 * Calculates the maximum accessible step based on sequential completion.
 * Users must complete steps in order - cannot skip ahead.
 *
 * This logic is used across:
 * - Server-side access control (page.tsx, evaluate route)
 * - Client-side UI (useStepper hook)
 *
 * @param steps - Array of steps with order property (can be optional)
 * @param isCompleted - Function that determines if a step is completed
 * @returns The order number of the first accessible incomplete step
 *
 * @example
 * // Usage with different step data structures
 * const maxVisitedStep = calculateMaxVisitedStep(
 *   steps,
 *   (step) => step.userStep?.status === "completed"
 * );
 */
export function calculateMaxVisitedStep<T extends { order?: number }>(
  steps: T[],
  isCompleted: (step: T) => boolean
): number {
  // Filter out steps without order and sort by order to ensure sequential checking
  const sortedSteps = steps
    .filter((step): step is T & { order: number } => step.order !== undefined)
    .sort((a, b) => a.order - b.order);

  // Find first incomplete step sequentially
  let maxVisitedStep = 0;
  for (const step of sortedSteps) {
    if (isCompleted(step)) {
      maxVisitedStep = step.order + 1;
    } else {
      // Found first incomplete step, stop here
      break;
    }
  }

  return maxVisitedStep;
}
