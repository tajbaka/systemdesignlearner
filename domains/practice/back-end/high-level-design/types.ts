// ============================================================================
// Core Domain Types
// ============================================================================

export type NodeId = string;
export type EdgeId = string;

export interface PlacedNode {
  id: NodeId;
  type: ComponentType; // Component type identifier
  name?: ComponentName; // Display name (optional for backward compatibility)
  x: number; // board coords
  y: number; // board coords
}

export interface Edge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  sourceHandle?: string;
  targetHandle?: string;
}

// ============================================================================
// Practice Design State
// ============================================================================

export type PracticeDesignState = {
  nodes: PlacedNode[];
  edges: Edge[];
};

// ============================================================================
// Component Types
// ============================================================================

/**
 * Component types are problem-specific and defined in each problem's solution.
 */
export type ComponentType = string;

/**
 * Display names for components (also problem-specific)
 */
export type ComponentName = string;

/**
 * All possible operations that can be performed on components
 */
export type ComponentOperation = "read" | "write";

export type HighLevelDesignEvaluationResult = {
  isCorrect: boolean;
  score: number;
  scoreWeight: number;
  missingConnections?: Array<{
    from: string;
    to: string;
    hints?: Array<{ id: string; title: string; text: string; href?: string }>;
  }>;
  extraConnections?: Array<{ from: string; to: string }>;
  missingNodes?: Array<{ type: string; count: number }>;
  partialMapping?: boolean;
  percentageScore?: number;
};
