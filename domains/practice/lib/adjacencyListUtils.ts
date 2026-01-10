/**
 * Utility functions for building and comparing adjacency lists
 */

import { ALLOWED_COMPONENTS_LIST } from "@/domains/practice/constants";

type Hint = {
  text: string;
  href?: string;
};

type ComponentsConfig = {
  nodes?: Array<{ id: string; type: string }>;
  edges?: Array<{
    from: string;
    to: string;
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }>;
};

type AdjacencyListEntry = {
  to: string;
  protocol?: string;
  op?: string;
  percentage?: number;
  hints?: Hint[];
};

export type AdjacencyList = Record<string, AdjacencyListEntry[]>;

/**
 * Map node IDs to display names
 * Note: Service1 and Service2 are kept distinct to differentiate between multiple services
 * The config now uses the actual node IDs (with spaces), so no mapping needed for most nodes
 */
const nodeNameMap: Record<string, string> = {
  APIGateway: "API Gateway",
  Service1: "Service1",
  Service2: "Service2",
};

const getDisplayName = (nodeId: string): string => {
  return nodeNameMap[nodeId] || nodeId;
};

/**
 * Build an adjacency list from components config (non-hook version for use in non-React contexts)
 */
export function buildAdjacencyList(components: ComponentsConfig): AdjacencyList {
  if (!components?.edges) {
    return {};
  }

  const edges = components.edges;
  const result: AdjacencyList = {};

  // Initialize all nodes (from nodes array if available, or from edges)
  const nodes = components.nodes || [];
  nodes.forEach((node: { id: string; type: string }) => {
    const displayName = getDisplayName(node.id);
    result[displayName] = [];
  });

  // Build adjacency list from edges
  edges.forEach(
    (edge: {
      from: string;
      to: string;
      protocol?: string;
      op?: string;
      percentage?: number;
      hints?: Hint[];
      flexibleMatching?: boolean;
    }) => {
      const fromDisplayName = getDisplayName(edge.from);
      const toDisplayName = getDisplayName(edge.to);

      if (!result[fromDisplayName]) {
        result[fromDisplayName] = [];
      }
      result[fromDisplayName].push({
        to: toDisplayName,
        ...(edge.protocol && { protocol: edge.protocol }),
        ...(edge.op && { op: edge.op }),
        ...(edge.percentage !== undefined && { percentage: edge.percentage }),
        ...(edge.hints && { hints: edge.hints }),
      });
    }
  );

  return result;
}

/**
 * Get all paths from a starting node in an adjacency list
 */
export function getAllPaths(
  graph: AdjacencyList,
  start: string,
  path: string[] = [],
  allPaths: string[][] = [],
  visited: Set<string> = new Set()
): string[][] {
  // Avoid cycles
  if (visited.has(start)) {
    return allPaths;
  }

  const newPath = [...path, start];
  const newVisited = new Set(visited);
  newVisited.add(start);

  const neighbors = graph[start] || [];

  if (neighbors.length === 0) {
    // Leaf node - save this path
    allPaths.push([...newPath]);
  } else {
    for (const edge of neighbors) {
      getAllPaths(graph, edge.to, newPath, allPaths, newVisited);
    }
  }

  return allPaths;
}

/**
 * Check if a user path matches an expected path (strict order match)
 */
function pathMatches(userPath: string[], expectedPath: string[]): boolean {
  return userPath.join(",") === expectedPath.join(",");
}

/**
 * Check if a user path contains an expected path as a subsequence
 */
function pathContains(userPath: string[], expectedPath: string[]): boolean {
  let expectedIdx = 0;
  for (const node of userPath) {
    if (expectedIdx < expectedPath.length && node === expectedPath[expectedIdx]) {
      expectedIdx++;
    }
  }
  return expectedIdx === expectedPath.length;
}

/**
 * Build a map of node metadata from components config
 */
function buildExpectedNodeMap(components: ComponentsConfig): Record<string, { type?: string }> {
  const nodeMap: Record<string, { type?: string }> = {};

  // Initialize from nodes array
  if (components.nodes) {
    components.nodes.forEach((node) => {
      const displayName = getDisplayName(node.id);
      nodeMap[displayName] = { type: node.type };
    });
  }

  // Initialize nodes from edges if not already in map
  if (components.edges) {
    components.edges.forEach((edge) => {
      const fromDisplayName = getDisplayName(edge.from);
      const toDisplayName = getDisplayName(edge.to);

      if (!nodeMap[fromDisplayName]) {
        nodeMap[fromDisplayName] = {};
      }
      if (!nodeMap[toDisplayName]) {
        nodeMap[toDisplayName] = {};
      }
    });
  }

  return nodeMap;
}

/**
 * Build a map of node names to their types from components config
 */
function buildNodeTypeMap(components: ComponentsConfig): Record<string, string> {
  const typeMap: Record<string, string> = {};

  if (components.nodes) {
    components.nodes.forEach((node) => {
      const displayName = getDisplayName(node.id);
      typeMap[displayName] = node.type;
    });
  }

  return typeMap;
}

/**
 * Compare expected and user adjacency lists to find missing paths, edges, and hidden nodes
 * Uses type-based grouping: if expected source node type matches user source node type,
 * any node of that type can satisfy the requirement (e.g., any "service" type node)
 */
export function compareDesignPaths(
  expectedAdjacencyList: AdjacencyList,
  userAdjacencyList: AdjacencyList,
  expectedComponents?: ComponentsConfig,
  userComponents?: ComponentsConfig
): {
  missingPaths: string[][];
  missingEdges: Array<{
    from: string;
    to: string;
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }>;
  hiddenNodes: Array<{
    node: string;
    skippedFrom: string;
    skippedTo: string;
    type?: string;
  }>;
  wrongEdges: Array<{
    from: string;
    expectedTo: string;
    actualTo: string[];
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }>;
} {
  const missingPaths: string[][] = [];
  const missingEdges: Array<{
    from: string;
    to: string;
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }> = [];
  const hiddenNodes: Array<{
    node: string;
    skippedFrom: string;
    skippedTo: string;
    type?: string;
  }> = [];
  const wrongEdges: Array<{
    from: string;
    expectedTo: string;
    actualTo: string[];
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }> = [];

  // Build type maps for type-based grouping
  const expectedNodeTypeMap = expectedComponents ? buildNodeTypeMap(expectedComponents) : {};
  const userNodeTypeMap = userComponents ? buildNodeTypeMap(userComponents) : {};

  /**
   * Helper to match service nodes flexibly
   * Matches "Service" to "Service1" or "Service2", and exact matches
   */
  const matchesServiceNode = (expected: string, user: string): boolean => {
    if (expected === user) return true;
    // Allow "Service" to match "Service1" or "Service2" (and vice versa for display purposes)
    if ((expected === "Service1" || expected === "Service2") && user === "Service") return true;
    if (expected === "Service" && (user === "Service1" || user === "Service2")) return true;
    return false;
  };

  /**
   * Check if operation values match, using ALLOWED_COMPONENTS_LIST to validate ops
   * - If expected has no op requirement → always matches
   * - If user has no op → matches (connection existence is what matters)
   * - If both have ops → require exact match and validate against target type's valid ops
   */
  const opsMatch = (
    expectedOp: string | undefined,
    userOp: string | undefined,
    targetType: string | undefined
  ): boolean => {
    // No op requirement in expected → always matches
    if (!expectedOp) return true;

    // User edge has no op → matches (connection exists, which satisfies the requirement)
    if (!userOp) return true;

    // Both have ops → require exact match
    if (expectedOp !== userOp) return false;

    // Validate that the op is valid for the target component type
    if (targetType) {
      const targetConfig = ALLOWED_COMPONENTS_LIST[targetType];
      if (targetConfig?.ops) {
        // Check if the expected op is in the valid ops array for this target type
        return targetConfig.ops.includes(expectedOp);
      }
    }

    // If no ops defined for target type, allow any op
    return true;
  };

  // Track which user edges have been "used" to satisfy expected edges
  const usedUserEdges = new Set<string>();
  // Track which expected edges have been satisfied
  const satisfiedExpectedEdges = new Set<string>();

  /**
   * Group expected edges by source node type for type-based matching
   * Returns a map of type -> array of {expectedFrom, expectedTo, edgeInfo}
   * All edges are grouped by type to allow any node of that type to satisfy the requirements
   */
  const groupEdgesByType = (): Record<
    string,
    Array<{
      expectedFrom: string;
      expectedTo: string;
      edgeInfo: AdjacencyListEntry;
    }>
  > => {
    const groups: Record<
      string,
      Array<{
        expectedFrom: string;
        expectedTo: string;
        edgeInfo: AdjacencyListEntry;
      }>
    > = {};

    for (const [from, edges] of Object.entries(expectedAdjacencyList)) {
      const fromType = expectedNodeTypeMap[from];
      if (!fromType) continue;

      for (const edge of edges) {
        if (!groups[fromType]) {
          groups[fromType] = [];
        }
        groups[fromType].push({
          expectedFrom: from,
          expectedTo: edge.to,
          edgeInfo: edge,
        });
      }
    }

    return groups;
  };

  /**
   * Check if a user service node can satisfy all edges for a specific expected source
   * Returns true if the user node has all required connections for that expected source
   */
  const userNodeSatisfiesExpectedSource = (
    userFrom: string,
    expectedSourceEdges: Array<{
      expectedFrom: string;
      expectedTo: string;
      edgeInfo: AdjacencyListEntry;
    }>
  ): boolean => {
    const userEdges = userAdjacencyList[userFrom] || [];

    for (const { expectedTo, edgeInfo } of expectedSourceEdges) {
      const targetType = expectedNodeTypeMap[expectedTo];
      const hasMatchingEdge = userEdges.some((userEdge) => {
        const targetMatches =
          expectedTo === userEdge.to || matchesServiceNode(expectedTo, userEdge.to);
        if (!targetMatches) return false;
        if (!opsMatch(edgeInfo.op, userEdge.op, targetType)) return false;
        if (edgeInfo.protocol && userEdge.protocol !== edgeInfo.protocol) return false;
        return true;
      });

      if (!hasMatchingEdge) {
        return false;
      }
    }

    return true;
  };

  /**
   * Try to satisfy a group of edges by finding user nodes that can satisfy each expected source's requirements
   * Different expected sources (e.g., Service1, Service2) can be satisfied by different user service nodes
   * Marks edges as satisfied and used when found
   */
  const trySatisfyGroup = (
    groupEdges: Array<{
      expectedFrom: string;
      expectedTo: string;
      edgeInfo: AdjacencyListEntry;
    }>,
    type: string
  ): boolean => {
    // Get all user nodes of this type
    const userNodesOfType: string[] = [];
    for (const [userFrom] of Object.entries(userAdjacencyList)) {
      const userFromType = userNodeTypeMap[userFrom];
      if (userFromType === type) {
        userNodesOfType.push(userFrom);
      }
    }

    // Group edges by expected source (e.g., Service1 edges vs Service2 edges)
    const edgesByExpectedSource = new Map<
      string,
      Array<{
        expectedFrom: string;
        expectedTo: string;
        edgeInfo: AdjacencyListEntry;
      }>
    >();

    for (const edge of groupEdges) {
      const edgeKey = `${edge.expectedFrom}→${edge.expectedTo}`;
      // Skip if already satisfied
      if (satisfiedExpectedEdges.has(edgeKey)) continue;

      if (!edgesByExpectedSource.has(edge.expectedFrom)) {
        edgesByExpectedSource.set(edge.expectedFrom, []);
      }
      edgesByExpectedSource.get(edge.expectedFrom)!.push(edge);
    }

    // Try to satisfy each expected source's requirements independently
    let allSatisfied = true;
    for (const [expectedFrom, expectedSourceEdges] of edgesByExpectedSource.entries()) {
      // Check if all edges for this expected source are already satisfied
      const allEdgesSatisfied = expectedSourceEdges.every((edge) =>
        satisfiedExpectedEdges.has(`${edge.expectedFrom}→${edge.expectedTo}`)
      );
      if (allEdgesSatisfied) continue;

      let sourceSatisfied = false;

      // Try each user node to see if it can satisfy this expected source's requirements
      for (const userFrom of userNodesOfType) {
        if (userNodeSatisfiesExpectedSource(userFrom, expectedSourceEdges)) {
          // Mark all edges for this expected source as satisfied
          const userEdges = userAdjacencyList[userFrom] || [];
          for (const { expectedTo, edgeInfo } of expectedSourceEdges) {
            const edgeKey = `${expectedFrom}→${expectedTo}`;
            if (satisfiedExpectedEdges.has(edgeKey)) continue;

            // Find the matching user edge and mark it as used
            const targetType = expectedNodeTypeMap[expectedTo];
            const matchingUserEdge = userEdges.find((userEdge) => {
              const targetMatches =
                expectedTo === userEdge.to || matchesServiceNode(expectedTo, userEdge.to);
              if (!targetMatches) return false;
              if (!opsMatch(edgeInfo.op, userEdge.op, targetType)) return false;
              if (edgeInfo.protocol && userEdge.protocol !== edgeInfo.protocol) return false;
              return true;
            });

            if (matchingUserEdge) {
              const userEdgeKey = `${userFrom}→${matchingUserEdge.to}→${matchingUserEdge.op || ""}→${matchingUserEdge.protocol || ""}`;
              // Only mark as used if not already used by another expected edge
              if (!usedUserEdges.has(userEdgeKey)) {
                usedUserEdges.add(userEdgeKey);
                satisfiedExpectedEdges.add(edgeKey);
              } else {
                // Edge already used, but we can still mark the expected edge as satisfied
                // if the op/protocol match (same user edge can satisfy multiple expected edges with same op)
                satisfiedExpectedEdges.add(edgeKey);
              }
            }
          }
          sourceSatisfied = true;
          break;
        }
      }

      if (!sourceSatisfied) {
        allSatisfied = false;
      }
    }

    return allSatisfied;
  };

  /**
   * Check if a user edge matches an expected edge (for non-flexible edges)
   * Returns true if found
   */
  const userHasMatchingEdge = (
    expectedFrom: string,
    expectedTo: string,
    expectedOp: string | undefined,
    expectedProtocol: string | undefined
  ): boolean => {
    const targetType = expectedNodeTypeMap[expectedTo];

    // First try exact match
    const exactMatch = userAdjacencyList[expectedFrom]?.some((e) => {
      if (e.to !== expectedTo) return false;
      if (!opsMatch(expectedOp, e.op, targetType)) return false;
      if (expectedProtocol && e.protocol !== expectedProtocol) return false;
      return true;
    });
    if (exactMatch) return true;

    // Then try flexible service matching for source (Service1/Service2/Service)
    for (const [userFrom, userEdges] of Object.entries(userAdjacencyList)) {
      const fromMatches = expectedFrom === userFrom || matchesServiceNode(expectedFrom, userFrom);

      if (fromMatches) {
        const hasMatchingEdge = userEdges.some((userEdge) => {
          const targetMatches =
            expectedTo === userEdge.to || matchesServiceNode(expectedTo, userEdge.to);
          if (!targetMatches) return false;
          if (!opsMatch(expectedOp, userEdge.op, targetType)) return false;
          if (expectedProtocol && userEdge.protocol !== expectedProtocol) return false;
          return true;
        });
        if (hasMatchingEdge) return true;
      }
    }

    return false;
  };

  // First, process flexible matching edges by grouping them and validating full paths
  const flexibleGroups = groupEdgesByType();
  for (const [type, groupEdges] of Object.entries(flexibleGroups)) {
    // Try to satisfy this group by finding a user node that has all required connections
    trySatisfyGroup(groupEdges, type);
  }

  // Find all expected paths starting from "Client"
  const expectedPaths = getAllPaths(expectedAdjacencyList, "Client");
  const userPaths = getAllPaths(userAdjacencyList, "Client");

  // Compare each expected path
  for (const expectedPath of expectedPaths) {
    // Check if any user path matches (strict or contains)
    const hasMatch = userPaths.some(
      (userPath) => pathMatches(userPath, expectedPath) || pathContains(userPath, expectedPath)
    );

    if (!hasMatch) {
      missingPaths.push(expectedPath);

      // Identify missing edges in this path
      for (let i = 0; i < expectedPath.length - 1; i++) {
        const from = expectedPath[i];
        const to = expectedPath[i + 1];

        // Check if this edge exists in user's design (with flexible service matching)
        const edgeInfo = expectedAdjacencyList[from]?.find((e) => e.to === to);
        if (edgeInfo) {
          const edgeKey = `${from}→${to}`;
          // Check if it was already satisfied in the group processing (type-based matching)
          const isSatisfied =
            satisfiedExpectedEdges.has(edgeKey) ||
            userHasMatchingEdge(from, to, edgeInfo.op, edgeInfo.protocol);

          if (!isSatisfied) {
            // Check if we already added this edge to missingEdges
            const alreadyAdded = missingEdges.some((e) => e.from === from && e.to === to);
            if (!alreadyAdded) {
              missingEdges.push({
                from,
                to,
                ...(edgeInfo.protocol && { protocol: edgeInfo.protocol }),
                ...(edgeInfo.op && { op: edgeInfo.op }),
                ...(edgeInfo.percentage !== undefined && { percentage: edgeInfo.percentage }),
                ...(edgeInfo.hints && { hints: edgeInfo.hints }),
              });
            }
          }
        }
      }
    }
  }

  // Also check for missing edges that aren't part of paths from Client
  for (const [from, edges] of Object.entries(expectedAdjacencyList)) {
    for (const edge of edges) {
      const edgeKey = `${from}→${edge.to}`;
      // Check if it was already satisfied in the group processing (type-based matching)
      const isSatisfied =
        satisfiedExpectedEdges.has(edgeKey) ||
        userHasMatchingEdge(from, edge.to, edge.op, edge.protocol);

      if (!isSatisfied) {
        // Check if we already added this edge to missingEdges
        const alreadyAdded = missingEdges.some((e) => e.from === from && e.to === edge.to);
        if (!alreadyAdded) {
          missingEdges.push({
            from,
            to: edge.to,
            ...(edge.protocol && { protocol: edge.protocol }),
            ...(edge.op && { op: edge.op }),
            ...(edge.percentage !== undefined && { percentage: edge.percentage }),
            ...(edge.hints && { hints: edge.hints }),
          });
        }
      }
    }
  }

  // Wrong connection detection: detect when user connects to wrong target from same source
  // Note: Type-based matching is handled by group matching above, so we skip wrong connection
  // detection for edges that were already processed in groups
  for (const [expectedFrom, expectedEdges] of Object.entries(expectedAdjacencyList)) {
    for (const expectedEdge of expectedEdges) {
      const edgeKey = `${expectedFrom}→${expectedEdge.to}`;
      // Skip wrong connection detection for edges already satisfied by type-based matching
      if (satisfiedExpectedEdges.has(edgeKey)) {
        continue;
      }

      // For wrong connection detection, we only check edges not satisfied by type-based matching
      const userHasExpectedEdge = userHasMatchingEdge(
        expectedFrom,
        expectedEdge.to,
        expectedEdge.op,
        expectedEdge.protocol
      );

      if (!userHasExpectedEdge) {
        // Find user's outgoing edges from the same source node (with flexible matching)
        const userOutEdges: string[] = [];

        // Try exact match first
        if (userAdjacencyList[expectedFrom]) {
          userAdjacencyList[expectedFrom].forEach((e) => {
            if (e.to !== expectedEdge.to && !matchesServiceNode(expectedEdge.to, e.to)) {
              userOutEdges.push(e.to);
            }
          });
        }

        // Try flexible service matching
        for (const [userFrom, userEdges] of Object.entries(userAdjacencyList)) {
          const fromMatches =
            expectedFrom === userFrom || matchesServiceNode(expectedFrom, userFrom);

          if (fromMatches) {
            userEdges.forEach((userEdge) => {
              // Only add if it's not the expected target and not already added
              const isExpectedTarget =
                expectedEdge.to === userEdge.to || matchesServiceNode(expectedEdge.to, userEdge.to);
              const alreadyAdded = userOutEdges.includes(userEdge.to);

              if (!isExpectedTarget && !alreadyAdded) {
                userOutEdges.push(userEdge.to);
              }
            });
          }
        }

        // If user has outgoing edges from this source but not the expected one, it's a wrong connection
        if (userOutEdges.length > 0) {
          // Check if we already added this wrong edge
          const alreadyAdded = wrongEdges.some(
            (e) => e.from === expectedFrom && e.expectedTo === expectedEdge.to
          );

          if (!alreadyAdded) {
            wrongEdges.push({
              from: expectedFrom,
              expectedTo: expectedEdge.to,
              actualTo: userOutEdges,
              ...(expectedEdge.protocol && { protocol: expectedEdge.protocol }),
              ...(expectedEdge.op && { op: expectedEdge.op }),
              ...(expectedEdge.percentage !== undefined && { percentage: expectedEdge.percentage }),
              ...(expectedEdge.hints && { hints: expectedEdge.hints }),
            });
          }
        }
      }
    }
  }

  // Hidden node detection: detect nodes that were skipped in user's path
  if (expectedComponents) {
    const expectedNodeMap = buildExpectedNodeMap(expectedComponents);

    for (const missingPath of missingPaths) {
      for (let idx = 1; idx < missingPath.length - 1; idx++) {
        const node = missingPath[idx];
        const prev = missingPath[idx - 1];
        const next = missingPath[idx + 1];

        const meta = expectedNodeMap[node];
        if (meta) {
          // Check if user has a direct connection that bypasses this node
          // Note: We don't use findAndMarkMatchingEdge here since this is just for detection, not scoring
          const hasDirectConnection = userAdjacencyList[prev]?.some(
            (e) => e.to === next || matchesServiceNode(next, e.to)
          );
          if (prev && next && hasDirectConnection) {
            // Check if we already added this hidden node
            const alreadyAdded = hiddenNodes.some(
              (h) => h.node === node && h.skippedFrom === prev && h.skippedTo === next
            );
            if (!alreadyAdded) {
              hiddenNodes.push({
                node,
                skippedFrom: prev,
                skippedTo: next,
                type: meta.type,
              });
            }
          }
        }
      }
    }
  }

  return { missingPaths, missingEdges, hiddenNodes, wrongEdges };
}

/**
 * Calculate score based on missing edges
 * Deducts the percentage of missing edges from 100 to get the score
 * @param missingEdges - Array of missing edges with their percentages
 * @param maxScore - Maximum possible score (default 35)
 * @returns Object with score, maxScore, and percentage
 */
export function calculateDesignScore(
  missingEdges: Array<{
    from: string;
    to: string;
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }>,
  maxScore: number = 35
): {
  score: number;
  maxScore: number;
  percentage: number;
} {
  // Sum up percentages of missing edges
  const missingPercentage = missingEdges.reduce((sum, edge) => {
    return sum + (edge.percentage || 0);
  }, 0);

  // Calculate achieved percentage: 100 - missing percentage
  const achievedPercentage = Math.max(0, 100 - missingPercentage);

  // Calculate score: (achievedPercentage / 100) * maxScore
  const score = (achievedPercentage / 100) * maxScore;

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    maxScore,
    percentage: Math.round(achievedPercentage * 100) / 100, // Round to 2 decimal places
  };
}
