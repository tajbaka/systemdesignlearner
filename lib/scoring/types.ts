/**
 * Scoring System Types
 *
 * Defines the type system for evaluating user solutions against optimal
 * reference solutions across all practice steps.
 */

import type { ComponentKind, PlacedNode, Edge } from "@/app/components/types";
import type { ApiEndpoint } from "@/lib/practice/types";

// ============================================================================
// Core Scoring Types
// ============================================================================

export type FeedbackSeverity = "blocking" | "warning" | "positive" | "info";
export type FeedbackCategory = "requirement" | "architecture" | "performance" | "bestPractice";

export type FeedbackItem = {
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  message: string;
  relatedTo?: string; // ID of requirement/component
  actionable?: string; // What user should do
};

export type FeedbackResult = {
  score: number;
  maxScore: number;
  percentage: number;
  blocking: FeedbackItem[];
  warnings: FeedbackItem[];
  positive: FeedbackItem[];
  suggestions: FeedbackItem[];
};

export type CumulativeScore = {
  total: number; // 0-100
  breakdown: {
    functional: number; // out of 25
    nonFunctional: number; // out of 20
    api: number; // out of 20
    design: number; // out of 30
    simulation: number; // out of 5
  };
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  grade: "A" | "B" | "C" | "D" | "F";
  percentile?: number; // Future: compare to other users
};

// ============================================================================
// Step 1: Functional Requirements Scoring
// ============================================================================

export type FunctionalRequirement = {
  id: string;
  label: string;
  description: string;
  keywords: string[]; // For text matching
  weight: number;
  required: boolean; // Core vs optional
  category: "core" | "optional";
  examplePhrases?: string[]; // Help users understand what to write
};

export type FunctionalScoringConfig = {
  maxScore: 25;
  coreRequirements: FunctionalRequirement[];
  optionalRequirements: FunctionalRequirement[];
  minKeywordsMatch: number; // Minimum keyword matches for credit
  minTextLength?: number; // Minimum characters in functionalSummary
};

export type FunctionalScoringInput = {
  functionalSummary: string;
  selectedRequirements: Record<string, boolean>; // From Requirements.functional
};

// ============================================================================
// Step 2: Non-Functional Requirements Scoring
// ============================================================================

export type NFRCategory = "scale" | "performance" | "availability" | "security" | "other";

export type NFRRange = {
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
};

export type NFRQuestion = {
  id: string;
  prompt: string;
  category: NFRCategory;
  optimalRanges: NFRRange;
  weight: number;
  requiredBy?: string[]; // Functional requirement IDs that trigger this question
  feedbackTemplates: {
    tooLow?: string;
    tooHigh?: string;
    optimal: string;
    missing?: string;
  };
};

export type NFRDecisionRule = {
  condition: {
    functionalRequirementId: string;
    required: boolean;
  };
  questions: string[]; // NFRQuestion IDs
};

export type QualitativeAspect = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  weight: number;
  examplePhrases?: string[];
};

export type NonFunctionalScoringConfig = {
  maxScore: 20;
  minTextLength?: number;
  // New structure with core and optional requirements
  coreRequirements?: QualitativeAspect[];
  optionalRequirements?: QualitativeAspect[];
  // Legacy qualitative structure
  qualitativeAspects?: QualitativeAspect[];
  evaluationCriteria?: {
    mentionsPerformance?: number;
    mentionsScalability?: number;
    mentionsAvailability?: number;
    mentionsReliability?: number;
  };
  // Old quantitative structure (kept for backward compatibility)
  questions?: NFRQuestion[];
  decisionRules?: NFRDecisionRule[];
};

export type NonFunctionalScoringInput = {
  readRps: number;
  writeRps: number;
  p95RedirectMs: number;
  availability: string;
  rateLimitNotes?: string;
  notes?: string;
  functionalRequirements: Record<string, boolean>; // From Step 1
};

// ============================================================================
// Step 3: API Definition Scoring
// ============================================================================

export type ApiEndpointConfig = {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  pathPattern: string; // Regex pattern or exact path
  pathPatternRegex?: string; // If pattern is regex
  purpose: string;
  requiredBy: string[]; // Links to functional requirement IDs
  weight: number;
  required: boolean;
  documentationHints: string[]; // Expected keywords in notes
  minDocumentationLength?: number;
  examplePath?: string;
  exampleNotes?: string;
};

export type ApiScoringConfig = {
  maxScore: 20;
  requiredEndpoints: ApiEndpointConfig[];
  optionalEndpoints: ApiEndpointConfig[];
  evaluationCriteria: {
    hasCorrectMethods: number; // Weight
    pathDesignQuality: number; // Weight
    documentationQuality: number; // Weight
    alignsWithRequirements: number; // Weight
  };
};

export type ApiScoringInput = {
  endpoints: ApiEndpoint[];
  functionalRequirements: Record<string, boolean>; // From Step 1
};

// ============================================================================
// Step 4: High-Level Design Scoring
// ============================================================================

export type Connection = {
  from: ComponentKind;
  to: ComponentKind;
  bidirectional?: boolean;
  optional?: boolean;
};

export type ArchitecturePattern = {
  id: string;
  name: string;
  description: string;
  requiredComponents: ComponentKind[];
  requiredConnections: Connection[];
  forbiddenConnections?: Connection[]; // Anti-patterns
  triggeredBy: {
    functionalReqs?: string[];
    nfrThresholds?: Record<string, number>; // e.g., { "readRps": 10000 }
  };
  weight: number;
  required: boolean;
  feedbackTemplates: {
    missing: string;
    present: string;
    incorrect?: string;
  };
};

export type ComponentRequirement = {
  kind: ComponentKind;
  required: boolean;
  requiredBy?: string[]; // Functional requirement IDs
  alternativesAccepted?: ComponentKind[]; // e.g., [Redis, Memcached]
  minReplicas?: number;
  maxReplicas?: number;
  weight: number;
  feedbackTemplates?: {
    missing?: string;
    present?: string;
    insufficientReplicas?: string;
    excessiveReplicas?: string;
  };
};

export type CriticalPath = {
  id: string;
  name: string;
  description: string;
  startComponents: ComponentKind[]; // Entry points (e.g., Web, API Gateway)
  endComponents: ComponentKind[]; // Destinations (e.g., DB, Cache)
  mustInclude: ComponentKind[];
  mustNotInclude?: ComponentKind[]; // Direct connections to avoid
  maxHops?: number;
  minHops?: number;
  weight: number;
  required: boolean;
  feedbackTemplates: {
    missing: string;
    present: string;
    suboptimal?: string;
  };
};

export type DesignScoringConfig = {
  maxScore: 30;
  architecturePatterns: ArchitecturePattern[];
  componentRequirements: ComponentRequirement[];
  criticalPaths: CriticalPath[];
  scoreBreakdown: {
    coreArchitecture: number; // Weight
    optionalComponents: number; // Weight
    connections: number; // Weight
  };
};

export type DesignScoringInput = {
  nodes: PlacedNode[];
  edges: Edge[];
  functionalRequirements: Record<string, boolean>; // From Step 1
  nfrValues: {
    readRps: number;
    writeRps: number;
    p95RedirectMs: number;
    availability: string;
  };
};

// ============================================================================
// Step 5: Simulation/Run Scoring
// ============================================================================

export type SimulationScoringConfig = {
  maxScore: 5;
  criteria: {
    meetsRps: number; // Weight
    meetsLatency: number; // Weight
    passesChaos: number; // Weight
  };
};

export type SimulationScoringInput = {
  meetsRps: boolean;
  meetsLatency: boolean;
  failedByChaos: boolean;
  actualRps?: number;
  targetRps?: number;
  actualLatency?: number;
  targetLatency?: number;
};

// ============================================================================
// Complete Scoring Configuration
// ============================================================================

export type ProblemScoringConfig = {
  problemId: string;
  title: string;
  description: string;
  totalScore: 100;
  steps: {
    functional: FunctionalScoringConfig;
    nonFunctional: NonFunctionalScoringConfig;
    api: ApiScoringConfig;
    design: DesignScoringConfig;
    simulation: SimulationScoringConfig;
  };
  metadata?: {
    version: string;
    author?: string;
    lastUpdated?: string;
  };
};

// ============================================================================
// Scoring Engine Interface
// ============================================================================

export interface IScoringEngine<TInput, TConfig> {
  evaluate(input: TInput, config: TConfig): FeedbackResult;
}

// ============================================================================
// Utility Types
// ============================================================================

export type PathNode = {
  nodeId: string;
  componentKind: ComponentKind;
  depth: number;
};

export type GraphPath = {
  nodes: PathNode[];
  edges: Edge[];
  length: number;
  valid: boolean;
};

export type KeywordMatch = {
  keyword: string;
  found: boolean;
  context?: string; // Surrounding text where keyword was found
};

export type ComponentMatch = {
  required: ComponentKind;
  found: PlacedNode | null;
  alternatives?: PlacedNode[]; // If alternatives were accepted
};
