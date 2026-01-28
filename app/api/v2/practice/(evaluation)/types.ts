import type { ProblemConfig } from "@/domains/practice/back-end/types";

// Base result item structure (for functional, non-functional)
type BaseResultItem = {
  id: string;
  complete: boolean;
  feedback?: string; // Optional AI feedback on why it failed
  hintId?: string; // Optional ID of the most relevant hint if failed
  itemIds?: string[]; // IDs of ALL incorrect UI elements to highlight
};

// API-specific result item with additional fields
type APIResultItem = BaseResultItem & {
  matchedEndpointId?: string; // The endpoint ID that AI matched this requirement to (for no-regression tracking)
  correctDescription?: boolean; // Whether the description meets requirements (used by frontend to calculate score)
};

// Base result structure (for functional, non-functional)
export type BaseEvaluationResult = {
  feedback: string;
  score?: number;
  results: BaseResultItem[];
};

// Cached extraction data per endpoint (for LLM optimization)
// Matches ExtractedApiInfo from api strategy
export type ExtractedEndpointData = {
  mainAction: string;
  requestBody: string;
  responseFormat: string;
  successStatusCode: string;
  errorCases: string[];
};

// Wrapper for cached extractions with version for schema drift detection
export type CachedExtractions = {
  version: number;
  data: Record<string, ExtractedEndpointData>;
};

// API-specific result with additional fields
export type APIEvaluationResult = {
  feedback: string;
  score?: number;
  results: APIResultItem[];
  // Snapshot of input that was evaluated (for change detection / no-regression)
  evaluatedInput?: {
    endpoints?: Array<{
      id: string;
      method: string;
      path: string;
      description: string;
    }>;
  };
  // Cached extractions for LLM optimization (skip re-extraction for unchanged endpoints)
  extractions?: CachedExtractions;
};

// Union type for all evaluation results
export type EvaluationResult = BaseEvaluationResult;

// Interface for any evaluation strategy (Functional, API, etc.)
export interface EvaluationStrategy<InputType = unknown, ResultType = EvaluationResult> {
  /**
   * Validates the raw input from the client.
   * Throws an error if invalid.
   * @param input - The raw JSON body input
   */
  validate(input: unknown): InputType;

  /**
   * Builds the prompt to send to the AI.
   * @param config - The full problem configuration
   * @param input - The validated user input
   */
  buildPrompt(config: ProblemConfig, input: InputType): string;

  /**
   * Parses the raw text response from the AI.
   * @param responseText - The raw string from Gemini
   * @param config - The config (needed to look up feedbackOnMissing strings)
   * @param userInput - The validated user input (used to extract matched values)
   */
  parseResponse(responseText: string, config: ProblemConfig, userInput: InputType): ResultType;
}
