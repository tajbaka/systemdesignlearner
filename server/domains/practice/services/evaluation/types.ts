import type { ProblemConfig } from "@/domains/practice/back-end/types";

// Base result item structure (for functional, non-functional)
type BaseResultItem = {
  id: string;
  complete: boolean;
  feedback?: string;
  hintId?: string;
  itemIds?: string[];
};

// API-specific result item with additional fields
type APIResultItem = BaseResultItem & {
  matchedEndpointId?: string;
  correctDescription?: boolean;
};

// Base result structure (for functional, non-functional)
export type BaseEvaluationResult = {
  feedback: string;
  score?: number;
  results: BaseResultItem[];
};

// Cached extraction data per endpoint
export type ExtractedEndpointData = {
  mainAction: string;
  requestBody: string;
  responseFormat: string;
  successStatusCode: string;
  errorCases: string[];
};

// Wrapper for cached extractions with version
export type CachedExtractions = {
  version: number;
  data: Record<string, ExtractedEndpointData>;
};

// API-specific result
export type APIEvaluationResult = {
  feedback: string;
  score?: number;
  results: APIResultItem[];
  evaluatedInput?: {
    endpoints?: Array<{
      id: string;
      method: string;
      path: string;
      description: string;
    }>;
  };
  extractions?: CachedExtractions;
};

// Union type
export type EvaluationResult = BaseEvaluationResult;

// Interface for any evaluation service
export interface EvaluationStrategy<InputType = unknown, ResultType = EvaluationResult> {
  validate(input: unknown): InputType;
  buildPrompt(config: ProblemConfig, input: InputType): string;
  parseResponse(responseText: string, config: ProblemConfig, userInput: InputType): ResultType;
}
