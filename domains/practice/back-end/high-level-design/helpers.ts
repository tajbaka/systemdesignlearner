import type { PracticeDesignState, PlacedNode, HighLevelDesignEvaluationResult } from "./types";
import type { DesignSolution } from "../types";
// ============================================================================
// Types
// ============================================================================

/**
 * Extract hints with id, title, text, and href from hints array
 */
function extractHints(
  hints?: Array<{ id: string; title: string; text: string; href?: string }>
): Array<{ id: string; title: string; text: string; href?: string }> | undefined {
  if (!hints || hints.length === 0) return undefined;
  const extractedHints = hints
    .filter((h) => h.id && h.title && h.text)
    .map((h) => ({ id: h.id, title: h.title, text: h.text, href: h.href }));
  return extractedHints.length > 0 ? extractedHints : undefined;
}

export type NodeType = string;
export type NodeId = string;
export type NodeMapping = Map<NodeId, NodeId>; // solution node ID -> user node ID
export type NodesMap = Record<string, Omit<PlacedNode, "id">>;

/**
 * Adjacency list entry - includes 'to' and any additional metadata
 */
export type AdjacencyListEntry = {
  to: string;
  weight?: number;
  hints?: Array<{ id: string; title: string; text: string; href?: string }>;
  [key: string]: unknown;
};

/**
 * Adjacency list structure: maps node ID to array of connected node IDs
 */
export type AdjacencyList = Record<string, AdjacencyListEntry[]>;

/**
 * Build an adjacency list from a diagram structure
 * Works with both PracticeDesignState and DesignSolution
 * Passes through any additional metadata from edges without knowing what it is
 */
export function buildAdjacencyList(
  diagram: PracticeDesignState | DesignSolution | null
): AdjacencyList {
  if (!diagram?.edges) {
    return {};
  }

  const result: AdjacencyList = {};

  // Initialize all nodes from the nodes array
  if (diagram.nodes) {
    diagram.nodes.forEach((node) => {
      result[node.id] = [];
    });
  }

  // Build adjacency list from edges
  diagram.edges.forEach((edge) => {
    const from = edge.from;
    const to = edge.to;

    // Initialize from node if not already in result
    if (!result[from]) {
      result[from] = [];
    }

    // Extract 'from' and 'to', then spread any remaining metadata
    const { from: _, to: __, ...metadata } = edge as Record<string, unknown>;

    result[from].push({
      to: to,
      ...metadata,
    });
  });

  return result;
}

/**
 * Build a nodes map from a diagram structure
 * Converts the nodes array into an object where keys are node IDs
 * and values are the node properties (excluding the id field)
 * Works with both PracticeDesignState and DesignSolution
 */
export function buildNodesMap(
  diagram: PracticeDesignState | DesignSolution | null
): Record<string, Omit<PlacedNode, "id">> {
  if (!diagram?.nodes) {
    return {};
  }

  const result: Record<string, Omit<PlacedNode, "id">> = {};

  diagram.nodes.forEach((node) => {
    const { id, ...nodeProps } = node;
    result[id] = nodeProps as Omit<PlacedNode, "id">;
  });

  return result;
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Find a valid mapping between solution nodes and user nodes
 * Returns null if no valid mapping exists
 */
export function findValidMapping(
  solutionNodes: NodesMap,
  solutionAdj: AdjacencyList,
  userNodes: NodesMap,
  userAdj: AdjacencyList
): NodeMapping | null {
  // Group nodes by type for both solution and user
  const solutionByType = groupNodesByType(solutionNodes);
  const userByType = groupNodesByType(userNodes);

  // Check if we have the right number of each type
  for (const [type, solutionIds] of Object.entries(solutionByType)) {
    const userIds = userByType[type] || [];
    if (solutionIds.length > userIds.length) {
      return null; // Not enough nodes of this type
    }
  }

  // Try to find a valid mapping using backtracking
  const mapping = new Map<NodeId, NodeId>();
  const usedUserNodes = new Set<NodeId>();

  if (
    backtrack(
      Array.from(Object.keys(solutionNodes)),
      0,
      mapping,
      usedUserNodes,
      solutionNodes,
      solutionAdj,
      userNodes,
      userAdj,
      solutionByType,
      userByType
    )
  ) {
    return mapping;
  }

  return null;
}

/**
 * Find the best partial mapping using a greedy approach
 * Unlike findValidMapping, this doesn't require a perfect match
 * Returns a mapping that maximizes structural similarity
 */
export function findBestPartialMapping(
  solutionNodes: NodesMap,
  solutionAdj: AdjacencyList,
  userNodes: NodesMap,
  userAdj: AdjacencyList
): NodeMapping {
  const userByType = groupNodesByType(userNodes);

  // Score all possible node pairings
  type ScoredPair = {
    solutionId: NodeId;
    userId: NodeId;
    score: number;
  };

  const scoredPairs: ScoredPair[] = [];

  // For each solution node, score it against all user nodes of the same type
  for (const [solutionId, solutionNode] of Object.entries(solutionNodes)) {
    const type = solutionNode.type.toLowerCase();
    const candidateUserNodes = userByType[type] || [];

    for (const userId of candidateUserNodes) {
      const score = scoreNodePairing(
        solutionId,
        userId,
        solutionAdj,
        userAdj,
        solutionNodes,
        userNodes
      );
      scoredPairs.push({ solutionId, userId, score });
    }
  }

  // Sort by score (highest first)
  scoredPairs.sort((a, b) => b.score - a.score);

  // Greedily select the best non-conflicting mappings
  const mapping = new Map<NodeId, NodeId>();
  const usedUserNodes = new Set<NodeId>();
  const mappedSolutionNodes = new Set<NodeId>();

  for (const pair of scoredPairs) {
    if (mappedSolutionNodes.has(pair.solutionId) || usedUserNodes.has(pair.userId)) {
      continue; // Already mapped
    }

    if (pair.score > 0) {
      mapping.set(pair.solutionId, pair.userId);
      usedUserNodes.add(pair.userId);
      mappedSolutionNodes.add(pair.solutionId);
    }
  }

  return mapping;
}

/**
 * Score how well a solution node maps to a user node
 * Based on connection similarity
 */
function scoreNodePairing(
  solutionNodeId: NodeId,
  userNodeId: NodeId,
  solutionAdj: AdjacencyList,
  userAdj: AdjacencyList,
  solutionNodes: NodesMap,
  userNodes: NodesMap
): number {
  let score = 0;

  const solutionOutgoing = solutionAdj[solutionNodeId] || [];
  const userOutgoing = userAdj[userNodeId] || [];

  // Count matching outgoing connection types
  const solutionTargetTypes = solutionOutgoing
    .map((e) => solutionNodes[e.to]?.type?.toLowerCase())
    .filter(Boolean);
  const userTargetTypes = userOutgoing
    .map((e) => userNodes[e.to]?.type?.toLowerCase())
    .filter(Boolean);

  // Score based on common target types
  for (const targetType of solutionTargetTypes) {
    if (userTargetTypes.includes(targetType)) {
      score += 1;
    }
  }

  // Check incoming connections
  for (const [fromId, edges] of Object.entries(solutionAdj)) {
    const hasEdgeToSolution = edges.some((e) => e.to === solutionNodeId);
    if (hasEdgeToSolution) {
      const sourceType = solutionNodes[fromId]?.type?.toLowerCase();
      if (sourceType) {
        // Check if user node has incoming edge from same type
        for (const [userFromId, userEdges] of Object.entries(userAdj)) {
          if (userNodes[userFromId]?.type?.toLowerCase() === sourceType) {
            if (userEdges.some((e) => e.to === userNodeId)) {
              score += 1;
            }
          }
        }
      }
    }
  }

  return score;
}

/**
 * Backtracking algorithm to find valid node mapping
 */
function backtrack(
  solutionNodeIds: NodeId[],
  index: number,
  mapping: NodeMapping,
  usedUserNodes: Set<NodeId>,
  solutionNodes: NodesMap,
  solutionAdj: AdjacencyList,
  userNodes: NodesMap,
  userAdj: AdjacencyList,
  solutionByType: Record<NodeType, NodeId[]>,
  userByType: Record<NodeType, NodeId[]>
): boolean {
  // Base case: all solution nodes mapped
  if (index === solutionNodeIds.length) {
    return true;
  }

  const solutionNodeId = solutionNodeIds[index];
  const solutionNodeType = solutionNodes[solutionNodeId].type.toLowerCase();
  const candidateUserNodes = userByType[solutionNodeType] || [];

  // Try mapping to each candidate user node
  for (const userNodeId of candidateUserNodes) {
    if (usedUserNodes.has(userNodeId)) {
      continue;
    }

    // Check if this mapping is consistent with existing mappings
    if (
      isConsistentMapping(
        solutionNodeId,
        userNodeId,
        mapping,
        solutionAdj,
        userAdj,
        solutionNodes,
        userNodes
      )
    ) {
      // Make the mapping
      mapping.set(solutionNodeId, userNodeId);
      usedUserNodes.add(userNodeId);

      // Recurse
      if (
        backtrack(
          solutionNodeIds,
          index + 1,
          mapping,
          usedUserNodes,
          solutionNodes,
          solutionAdj,
          userNodes,
          userAdj,
          solutionByType,
          userByType
        )
      ) {
        return true;
      }

      // Backtrack
      mapping.delete(solutionNodeId);
      usedUserNodes.delete(userNodeId);
    }
  }

  return false;
}

/**
 * Check if mapping solutionNode -> userNode is consistent with existing mappings
 * Validates both already-mapped connections and checks if enough unmapped connections exist
 */
function isConsistentMapping(
  solutionNodeId: NodeId,
  userNodeId: NodeId,
  mapping: NodeMapping,
  solutionAdj: AdjacencyList,
  userAdj: AdjacencyList,
  solutionNodes: NodesMap,
  userNodes: NodesMap
): boolean {
  const solutionOutgoing = solutionAdj[solutionNodeId] || [];
  const userOutgoing = userAdj[userNodeId] || [];

  // Early check: user node must have at least as many outgoing edges as solution node
  if (userOutgoing.length < solutionOutgoing.length) {
    return false;
  }

  // Check outgoing edges to already mapped nodes
  for (const solutionEdge of solutionOutgoing) {
    const targetSolutionNodeId = solutionEdge.to;
    const targetUserNodeId = mapping.get(targetSolutionNodeId);

    if (targetUserNodeId !== undefined) {
      const hasEdge = userOutgoing.some((edge) => edge.to === targetUserNodeId);
      if (!hasEdge) {
        return false;
      }
    }
  }

  // Count how many unmapped targets of each type the solution node connects to
  const unmappedTargetTypeCount = new Map<string, number>();
  for (const solutionEdge of solutionOutgoing) {
    const targetSolutionNodeId = solutionEdge.to;
    if (mapping.get(targetSolutionNodeId) === undefined) {
      const targetType = solutionNodes[targetSolutionNodeId]?.type?.toLowerCase();
      if (targetType) {
        unmappedTargetTypeCount.set(targetType, (unmappedTargetTypeCount.get(targetType) || 0) + 1);
      }
    }
  }

  // Check if user node has enough unmapped connections to nodes of each required type
  const usedUserTargets = new Set(Array.from(mapping.values()));
  for (const [targetType, requiredCount] of unmappedTargetTypeCount.entries()) {
    const availableCount = userOutgoing.filter((edge) => {
      const userTargetType = userNodes[edge.to]?.type?.toLowerCase();
      return userTargetType === targetType && !usedUserTargets.has(edge.to);
    }).length;

    if (availableCount < requiredCount) {
      return false;
    }
  }

  // Check incoming edges from already mapped nodes
  for (const [fromSolutionId, edges] of Object.entries(solutionAdj)) {
    const fromUserId = mapping.get(fromSolutionId);
    if (fromUserId === undefined) continue;

    const hasEdgeToSolution = edges.some((edge) => edge.to === solutionNodeId);
    if (hasEdgeToSolution) {
      const userEdges = userAdj[fromUserId] || [];
      const hasEdgeToUser = userEdges.some((edge) => edge.to === userNodeId);
      if (!hasEdgeToUser) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Group node IDs by their type
 */
function groupNodesByType(nodes: NodesMap): Record<NodeType, NodeId[]> {
  const result: Record<NodeType, NodeId[]> = {};
  for (const [nodeId, nodeProps] of Object.entries(nodes)) {
    const type = nodeProps.type.toLowerCase();
    if (!result[type]) {
      result[type] = [];
    }
    result[type].push(nodeId);
  }
  return result;
}

// ============================================================================
// Evaluation Functions
// ============================================================================

/**
 * Calculate maximum possible score from solution
 */
export function calculateMaxScore(solutionAdj: AdjacencyList): number {
  let total = 0;
  for (const edges of Object.values(solutionAdj)) {
    for (const edge of edges) {
      total += edge.weight || 10;
    }
  }
  return total;
}

/**
 * Evaluate the diagram based on the found mapping
 */
export function evaluateWithMapping(
  mapping: NodeMapping,
  solutionAdj: AdjacencyList,
  userAdj: AdjacencyList,
  solutionNodes: NodesMap,
  userNodes: NodesMap
): HighLevelDesignEvaluationResult {
  const missingConnections: Array<{
    from: string;
    to: string;
    hints?: Array<{ id: string; title: string; text: string; href?: string }>;
  }> = [];
  const extraConnections: Array<{ from: string; to: string }> = [];

  let score = 0;
  let scoreWeight = 0;

  // Check each edge in the solution
  for (const [fromSolutionId, solutionEdges] of Object.entries(solutionAdj)) {
    const fromUserId = mapping.get(fromSolutionId);
    if (!fromUserId) continue;

    const userEdges = userAdj[fromUserId] || [];

    for (const solutionEdge of solutionEdges) {
      const toSolutionId = solutionEdge.to;
      const toUserId = mapping.get(toSolutionId);
      if (!toUserId) continue;

      const edgeScore = solutionEdge.weight || 10;
      scoreWeight += edgeScore;

      const hasEdge = userEdges.some((edge) => edge.to === toUserId);
      if (hasEdge) {
        score += edgeScore;
      } else {
        missingConnections.push({
          from: solutionNodes[fromSolutionId].type.toLowerCase(),
          to: solutionNodes[toSolutionId].type.toLowerCase(),
          hints: extractHints(solutionEdge.hints),
        });
      }
    }
  }

  // Check for extra connections
  for (const [fromUserId, userEdges] of Object.entries(userAdj)) {
    const fromSolutionId = [...mapping.entries()].find(([_, userId]) => userId === fromUserId)?.[0];
    if (!fromSolutionId) continue;

    const solutionEdges = solutionAdj[fromSolutionId] || [];

    for (const userEdge of userEdges) {
      const toUserId = userEdge.to;
      const toSolutionId = [...mapping.entries()].find(([_, userId]) => userId === toUserId)?.[0];
      if (!toSolutionId) continue;

      const hasEdge = solutionEdges.some((edge) => edge.to === toSolutionId);
      if (!hasEdge) {
        extraConnections.push({
          from: userNodes[fromUserId].type,
          to: userNodes[toUserId].type,
        });
      }
    }
  }

  return {
    isCorrect: score === scoreWeight && extraConnections.length === 0,
    score,
    scoreWeight,
    missingConnections: missingConnections.length > 0 ? missingConnections : undefined,
    extraConnections: extraConnections.length > 0 ? extraConnections : undefined,
  };
}

/**
 * Evaluate diagram with partial mapping
 * This handles cases where not all nodes map perfectly
 */
export function evaluateWithPartialMapping(
  mapping: NodeMapping,
  solutionAdj: AdjacencyList,
  userAdj: AdjacencyList,
  solutionNodes: NodesMap,
  userNodes: NodesMap
): HighLevelDesignEvaluationResult {
  const missingConnections: Array<{
    from: string;
    to: string;
    hints?: Array<{ id: string; title: string; text: string; href?: string }>;
  }> = [];
  const extraConnections: Array<{ from: string; to: string }> = [];
  const missingNodes: Array<{ type: string; count: number }> = [];

  let score = 0;
  let scoreWeight = 0;

  // Track which solution nodes are mapped
  const mappedSolutionNodes = new Set(mapping.keys());
  const mappedUserNodes = new Set(mapping.values());

  // Check missing solution nodes (nodes in solution but not mapped)
  const solutionByType = groupNodesByType(solutionNodes);

  const mappedSolutionByType: Record<string, number> = {};
  for (const solutionId of mappedSolutionNodes) {
    const type = solutionNodes[solutionId]?.type?.toLowerCase();
    if (type) {
      mappedSolutionByType[type] = (mappedSolutionByType[type] || 0) + 1;
    }
  }

  for (const [type, solutionIds] of Object.entries(solutionByType)) {
    const mappedCount = mappedSolutionByType[type] || 0;
    const unmappedCount = solutionIds.length - mappedCount;

    if (unmappedCount > 0) {
      missingNodes.push({ type, count: unmappedCount });
    }
  }

  // Check each edge in the solution
  for (const [fromSolutionId, solutionEdges] of Object.entries(solutionAdj)) {
    const fromUserId = mapping.get(fromSolutionId);

    for (const solutionEdge of solutionEdges) {
      const toSolutionId = solutionEdge.to;
      const toUserId = mapping.get(toSolutionId);
      const edgeScore = solutionEdge.weight || 10;
      scoreWeight += edgeScore;

      // Case 1: Both nodes are mapped - check exact connection
      if (fromUserId && toUserId) {
        const userEdges = userAdj[fromUserId] || [];
        const hasEdge = userEdges.some((edge) => edge.to === toUserId);

        if (hasEdge) {
          score += edgeScore;
        } else {
          // This catches "Service->DB2 instead of DB1" cases!
          const connection = {
            from: solutionNodes[fromSolutionId].type.toLowerCase(),
            to: solutionNodes[toSolutionId].type.toLowerCase(),
            hints: extractHints(solutionEdge.hints),
          };
          missingConnections.push(connection);
        }
      }
      // Case 2: Source mapped but target not mapped (target node missing)
      else if (fromUserId && !toUserId) {
        missingConnections.push({
          from: solutionNodes[fromSolutionId].type.toLowerCase(),
          to: solutionNodes[toSolutionId].type.toLowerCase(),
          hints: extractHints(solutionEdge.hints),
        });
      }
      // Case 3: Target mapped but source not mapped (source node missing)
      else if (!fromUserId && toUserId) {
        missingConnections.push({
          from: solutionNodes[fromSolutionId].type.toLowerCase(),
          to: solutionNodes[toSolutionId].type.toLowerCase(),
          hints: extractHints(solutionEdge.hints),
        });
      }
      // Case 4: Neither mapped (both nodes missing)
      else {
        missingConnections.push({
          from: solutionNodes[fromSolutionId].type.toLowerCase(),
          to: solutionNodes[toSolutionId].type.toLowerCase(),
          hints: extractHints(solutionEdge.hints),
        });
      }
    }
  }

  // Check for extra connections (from mapped user nodes)
  for (const [fromUserId, userEdges] of Object.entries(userAdj)) {
    if (!mappedUserNodes.has(fromUserId)) continue;

    const fromSolutionId = [...mapping.entries()].find(([_, userId]) => userId === fromUserId)?.[0];
    if (!fromSolutionId) continue;

    const solutionEdges = solutionAdj[fromSolutionId] || [];

    for (const userEdge of userEdges) {
      const toUserId = userEdge.to;
      if (!mappedUserNodes.has(toUserId)) continue;

      const toSolutionId = [...mapping.entries()].find(([_, userId]) => userId === toUserId)?.[0];
      if (!toSolutionId) continue;

      const hasEdge = solutionEdges.some((edge) => edge.to === toSolutionId);
      if (!hasEdge) {
        extraConnections.push({
          from: userNodes[fromUserId].type,
          to: userNodes[toUserId].type,
        });
      }
    }
  }

  return {
    isCorrect: false,
    score,
    scoreWeight,
    missingConnections: missingConnections.length > 0 ? missingConnections : undefined,
    extraConnections: extraConnections.length > 0 ? extraConnections : undefined,
    missingNodes: missingNodes.length > 0 ? missingNodes : undefined,
    partialMapping: true,
  };
}

/**
 * Evaluate partial match when full mapping fails
 * Provides detailed feedback about what's correct and what's missing
 */
export function evaluatePartialMatch(
  solutionAdj: AdjacencyList,
  userAdj: AdjacencyList,
  solutionNodes: NodesMap,
  userNodes: NodesMap
): HighLevelDesignEvaluationResult {
  const missingConnections: Array<{
    from: string;
    to: string;
    hints?: Array<{ id: string; title: string; text: string; href?: string }>;
  }> = [];
  const missingNodes: Array<{ type: string; count: number }> = [];

  const scoreWeight = calculateMaxScore(solutionAdj);

  // Check node counts by type
  const solutionByType = groupNodesByType(solutionNodes);
  const userByType = groupNodesByType(userNodes);

  // Find missing nodes
  for (const [type, solutionIds] of Object.entries(solutionByType)) {
    const userIds = userByType[type] || [];
    if (userIds.length < solutionIds.length) {
      missingNodes.push({
        type,
        count: solutionIds.length - userIds.length,
      });
    }
  }

  // Build a map of solution edges with their scores
  const solutionEdgeDetails = new Map<
    string,
    Array<{
      weight: number;
      hints?: Array<{ id: string; title: string; text: string; href?: string }>;
    }>
  >();

  for (const [fromId, edges] of Object.entries(solutionAdj)) {
    const fromType = solutionNodes[fromId]?.type?.toLowerCase();
    if (!fromType) continue;

    for (const edge of edges) {
      const toType = solutionNodes[edge.to]?.type?.toLowerCase();
      if (toType) {
        const key = `${fromType}->${toType}`;
        if (!solutionEdgeDetails.has(key)) {
          solutionEdgeDetails.set(key, []);
        }
        solutionEdgeDetails.get(key)!.push({
          weight: edge.weight || 10,
          hints: extractHints(edge.hints),
        });
      }
    }
  }

  // Count user connections by type
  const userConnectionTypes = new Map<string, number>();
  for (const [fromId, edges] of Object.entries(userAdj)) {
    const fromType = userNodes[fromId]?.type?.toLowerCase();
    if (!fromType) continue;

    for (const edge of edges) {
      const toType = userNodes[edge.to]?.type?.toLowerCase();
      if (toType) {
        const key = `${fromType}->${toType}`;
        userConnectionTypes.set(key, (userConnectionTypes.get(key) || 0) + 1);
      }
    }
  }

  // Calculate score and find missing connections
  let score = 0;

  for (const [connectionType, solutionEdges] of solutionEdgeDetails.entries()) {
    const userCount = userConnectionTypes.get(connectionType) || 0;
    const [from, to] = connectionType.split("->");
    const requiredCount = solutionEdges.length;

    // Award points for connections that exist
    // Match user connections to solution connections (best case scenario)
    const matchingCount = Math.min(userCount, requiredCount);

    // Sort solution edges by weight (highest first) to award best scores first
    const sortedEdges = [...solutionEdges].sort((a, b) => b.weight - a.weight);

    for (let i = 0; i < matchingCount; i++) {
      score += sortedEdges[i].weight;
    }

    // Track missing connections (the ones not matched)
    for (let i = matchingCount; i < requiredCount; i++) {
      missingConnections.push({
        from,
        to,
        hints: sortedEdges[i].hints,
      });
    }
  }

  const percentageScore = score / scoreWeight;

  return {
    isCorrect: false,
    percentageScore,
    score,
    scoreWeight,
    missingConnections: missingConnections.length > 0 ? missingConnections : undefined,
    missingNodes: missingNodes.length > 0 ? missingNodes : undefined,
  };
}
