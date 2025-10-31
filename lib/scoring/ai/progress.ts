/**
 * Progress Tracking for AI Evaluation
 *
 * Provides real-time progress updates during AI scoring
 * to improve perceived performance and user experience.
 */

export type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "complete" | "error";
  progress: number; // 0-100
  message?: string;
};

export type ProgressCallback = (steps: ProgressStep[]) => void;

export class EvaluationProgress {
  private steps: ProgressStep[];
  private callback: ProgressCallback | null = null;

  constructor(stepLabels: string[]) {
    this.steps = stepLabels.map((label, index) => ({
      id: `step-${index}`,
      label,
      status: "pending" as const,
      progress: 0,
    }));
  }

  /**
   * Set progress callback
   */
  onProgress(callback: ProgressCallback): this {
    this.callback = callback;
    return this;
  }

  /**
   * Start a step
   */
  start(stepIndex: number, message?: string): void {
    if (stepIndex >= this.steps.length) return;

    this.steps[stepIndex].status = "running";
    this.steps[stepIndex].progress = 0;
    this.steps[stepIndex].message = message;

    this.notify();
  }

  /**
   * Update step progress
   */
  update(stepIndex: number, progress: number, message?: string): void {
    if (stepIndex >= this.steps.length) return;

    this.steps[stepIndex].progress = Math.min(100, Math.max(0, progress));
    if (message) {
      this.steps[stepIndex].message = message;
    }

    this.notify();
  }

  /**
   * Complete a step
   */
  complete(stepIndex: number, message?: string): void {
    if (stepIndex >= this.steps.length) return;

    this.steps[stepIndex].status = "complete";
    this.steps[stepIndex].progress = 100;
    if (message) {
      this.steps[stepIndex].message = message;
    }

    this.notify();
  }

  /**
   * Mark step as error
   */
  error(stepIndex: number, message: string): void {
    if (stepIndex >= this.steps.length) return;

    this.steps[stepIndex].status = "error";
    this.steps[stepIndex].message = message;

    this.notify();
  }

  /**
   * Get current progress percentage
   */
  getOverallProgress(): number {
    if (this.steps.length === 0) return 0;

    const totalProgress = this.steps.reduce((sum, step) => sum + step.progress, 0);
    return Math.round(totalProgress / this.steps.length);
  }

  /**
   * Get steps snapshot
   */
  getSteps(): ProgressStep[] {
    return [...this.steps];
  }

  /**
   * Notify callback
   */
  private notify(): void {
    if (this.callback) {
      this.callback(this.getSteps());
    }
  }
}

/**
 * Create progress tracker for functional requirements evaluation
 */
export function createFunctionalProgress(): EvaluationProgress {
  return new EvaluationProgress([
    "Analyzing text with rules",
    "Understanding with AI",
    "Validating requirements",
    "Generating feedback",
  ]);
}

/**
 * Create progress tracker for API evaluation
 */
export function createApiProgress(): EvaluationProgress {
  return new EvaluationProgress([
    "Checking endpoints",
    "Analyzing API design",
    "Validating best practices",
    "Generating feedback",
  ]);
}

/**
 * Create progress tracker for design evaluation
 */
export function createDesignProgress(): EvaluationProgress {
  return new EvaluationProgress([
    "Analyzing components",
    "Finding critical paths",
    "Checking patterns",
    "AI architecture review",
    "Generating feedback",
  ]);
}
