/**
 * Design Scoring Engine
 *
 * Evaluates high-level architecture design using graph traversal:
 * - Component presence and configuration
 * - Critical path validation
 * - Architecture pattern matching
 * - Connection topology analysis
 */

import type {
  DesignScoringConfig,
  DesignScoringInput,
  FeedbackResult,
  FeedbackItem,
  IScoringEngine,
  ComponentRequirement,
  CriticalPath,
  ArchitecturePattern,
  ComponentMatch,
  GraphPath,
  PathNode,
} from "../types";
import type { PlacedNode, Edge } from "@/lib/types/domain";
import { hasConnectionBetweenKinds } from "@/components/canvas/utils";

export class DesignScoringEngine
  implements IScoringEngine<DesignScoringInput, DesignScoringConfig>
{
  // Cache for connection checks to avoid repeated BFS traversals
  private connectionCache: Map<string, boolean> = new Map();

  /**
   * Evaluate design architecture
   */
  evaluate(input: DesignScoringInput, config: DesignScoringConfig): FeedbackResult {
    // Clear cache at start of evaluation
    this.connectionCache.clear();

    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    const suggestions: FeedbackItem[] = [];

    let coreScore = 0;
    let bonusScore = 0;
    let bonusMax = 0;
    const maxScore = config.maxScore;

    // 1. Evaluate component requirements
    const componentResults = this.evaluateComponents(
      input.nodes,
      config.componentRequirements,
      input.functionalRequirements,
      input.nfrValues
    );

    coreScore += componentResults.score;
    bonusScore += componentResults.bonusScore;
    bonusMax += componentResults.bonusMax;
    blocking.push(...componentResults.blocking);
    warnings.push(...componentResults.warnings);
    positive.push(...componentResults.positive);

    // 2. Evaluate critical paths
    const pathResults = this.evaluateCriticalPaths(
      input.nodes,
      input.edges,
      config.criticalPaths,
      input.functionalRequirements
    );

    coreScore += pathResults.score;
    bonusScore += pathResults.bonusScore;
    bonusMax += pathResults.bonusMax;
    blocking.push(...pathResults.blocking);
    warnings.push(...pathResults.warnings);
    positive.push(...pathResults.positive);

    // 3. Evaluate architecture patterns
    const patternResults = this.evaluateArchitecturePatterns(
      input.nodes,
      input.edges,
      config.architecturePatterns,
      input.functionalRequirements,
      input.nfrValues
    );

    coreScore += patternResults.score;
    bonusScore += patternResults.bonusScore;
    bonusMax += patternResults.bonusMax;
    blocking.push(...patternResults.blocking);
    warnings.push(...patternResults.warnings);
    positive.push(...patternResults.positive);

    // Overall feedback
    const clampedCoreScore = Math.min(coreScore, maxScore);
    const percentage = (clampedCoreScore / maxScore) * 100;
    const totalScore = Math.min(clampedCoreScore + bonusScore, maxScore + bonusMax);

    // Add blocking issue if score is too low (below 30%)
    if (percentage < 30 && blocking.length === 0) {
      blocking.push({
        category: "architecture",
        severity: "blocking",
        message: `Your architecture design score is too low (${percentage.toFixed(0)}%). You need at least 30% to proceed.`,
        actionable:
          "Add critical components to your design: Web servers, API layer, Service layer, and Database. Connect them to form a complete data flow path.",
      });
    }

    if (blocking.length === 0) {
      if (percentage >= 90) {
        positive.unshift({
          category: "architecture",
          severity: "positive",
          message:
            "Outstanding architecture! Your design demonstrates production-ready patterns and best practices.",
        });
      } else if (percentage >= 75) {
        positive.unshift({
          category: "architecture",
          severity: "positive",
          message:
            "Solid architecture! Core patterns are in place. Consider the suggestions to optimize further.",
        });
      } else if (warnings.length > 0) {
        suggestions.push({
          category: "architecture",
          severity: "info",
          message:
            "Your architecture has the basics, but review the warnings to improve scalability and performance.",
        });
      }
    }

    return {
      score: clampedCoreScore,
      maxScore,
      percentage,
      blocking,
      warnings,
      positive,
      suggestions,
      bonus: bonusMax > 0 ? { score: bonusScore, maxScore: bonusMax } : undefined,
      totalScore,
      totalMaxScore: maxScore + bonusMax,
    };
  }

  /**
   * Evaluate component requirements
   */
  private evaluateComponents(
    nodes: PlacedNode[],
    requirements: ComponentRequirement[],
    functionalReqs: Record<string, boolean>,
    nfrValues: DesignScoringInput["nfrValues"]
  ): {
    score: number;
    bonusScore: number;
    bonusMax: number;
    blocking: FeedbackItem[];
    warnings: FeedbackItem[];
    positive: FeedbackItem[];
  } {
    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    let score = 0;
    let bonusScore = 0;
    let bonusMax = 0;

    for (const requirement of requirements) {
      if (requirement.isBonus) {
        bonusMax += requirement.weight;
      }
      const match = this.findComponent(nodes, requirement);

      // Check if this component is required by selected functional requirements
      const isRequiredByFunctional = requirement.requiredBy
        ? requirement.requiredBy.some((reqId) => functionalReqs[reqId] === true)
        : requirement.required;

      if (match.found) {
        if (requirement.isBonus) {
          bonusScore += requirement.weight;
        } else {
          score += requirement.weight;
        }

        // Check replica count
        const replicaIssue = this.checkReplicaCount(match.found, requirement, nfrValues);
        if (replicaIssue) {
          warnings.push(replicaIssue);
        } else {
          if (requirement.feedbackTemplates?.present) {
            positive.push({
              category: "architecture",
              severity: "positive",
              message: requirement.feedbackTemplates.present,
              relatedTo: requirement.kind,
            });
          }
        }
      } else if (isRequiredByFunctional) {
        const message =
          requirement.feedbackTemplates?.missing ||
          `Missing required component: ${requirement.kind}`;
        blocking.push({
          category: "requirement",
          severity: "blocking",
          message,
          relatedTo: requirement.kind,
          actionable: `Add ${requirement.kind} to your design`,
        });
      }
    }

    return { score, bonusScore, bonusMax, blocking, warnings, positive };
  }

  /**
   * Find a component in the design
   */
  private findComponent(nodes: PlacedNode[], requirement: ComponentRequirement): ComponentMatch {
    // Check for exact match
    const exact = nodes.find((node) => node.spec.kind === requirement.kind);
    if (exact) {
      return { required: requirement.kind, found: exact };
    }

    // Check for acceptable alternatives
    if (requirement.alternativesAccepted) {
      const alternatives = nodes.filter((node) =>
        requirement.alternativesAccepted!.includes(node.spec.kind)
      );
      if (alternatives.length > 0) {
        return { required: requirement.kind, found: alternatives[0], alternatives };
      }
    }

    return { required: requirement.kind, found: null };
  }

  /**
   * Check if replica count is appropriate
   */
  private checkReplicaCount(
    node: PlacedNode,
    requirement: ComponentRequirement,
    nfrValues: DesignScoringInput["nfrValues"]
  ): FeedbackItem | null {
    const replicas = node.replicas || 1;

    // Check minimum replicas
    if (requirement.minReplicas && replicas < requirement.minReplicas) {
      return {
        category: "architecture",
        severity: "warning",
        message:
          requirement.feedbackTemplates?.insufficientReplicas ||
          `${node.spec.kind} has ${replicas} replica(s) but needs at least ${requirement.minReplicas} for reliability.`,
        relatedTo: node.id,
        actionable: `Increase replicas to ${requirement.minReplicas}+`,
      };
    }

    // Check for high RPS requiring scaling
    if (nfrValues.readRps > 10000 && replicas === 1 && node.spec.kind === "Service") {
      return {
        category: "performance",
        severity: "warning",
        message: `With ${nfrValues.readRps} RPS target, your Service needs multiple replicas for horizontal scaling.`,
        relatedTo: node.id,
        actionable: "Add more Service replicas",
      };
    }

    // Check maximum replicas (over-engineering)
    if (requirement.maxReplicas && replicas > requirement.maxReplicas) {
      return {
        category: "architecture",
        severity: "info",
        message:
          requirement.feedbackTemplates?.excessiveReplicas ||
          `${node.spec.kind} has ${replicas} replicas which may be excessive.`,
        relatedTo: node.id,
      };
    }

    return null;
  }

  /**
   * Evaluate critical paths through the architecture
   */
  private evaluateCriticalPaths(
    nodes: PlacedNode[],
    edges: Edge[],
    paths: CriticalPath[],
    _functionalReqs: Record<string, boolean>
  ): {
    score: number;
    bonusScore: number;
    bonusMax: number;
    blocking: FeedbackItem[];
    warnings: FeedbackItem[];
    positive: FeedbackItem[];
  } {
    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    let score = 0;
    let bonusScore = 0;
    let bonusMax = 0;

    for (const pathConfig of paths) {
      if (pathConfig.isBonus) {
        bonusMax += pathConfig.weight;
      }
      // Check if path is required
      const isRequired = pathConfig.required;

      // Find all paths from start to end
      const foundPaths = this.findPaths(nodes, edges, pathConfig);

      if (foundPaths.length === 0) {
        if (isRequired) {
          blocking.push({
            category: "architecture",
            severity: "blocking",
            message: pathConfig.feedbackTemplates.missing,
            relatedTo: pathConfig.id,
            actionable: `Ensure there's a path: ${pathConfig.startComponents.join("/")} → ${pathConfig.mustInclude.join(" → ")} → ${pathConfig.endComponents.join("/")}`,
          });
        }
        continue;
      }

      // Evaluate found paths
      const bestPath = this.selectBestPath(foundPaths, pathConfig);
      if (bestPath.valid) {
        if (pathConfig.isBonus) {
          bonusScore += pathConfig.weight;
          bonusMax += pathConfig.weight;
        } else {
          score += pathConfig.weight;
        }
        positive.push({
          category: "architecture",
          severity: "positive",
          message: pathConfig.feedbackTemplates.present,
          relatedTo: pathConfig.id,
        });
      } else {
        warnings.push({
          category: "architecture",
          severity: "warning",
          message:
            pathConfig.feedbackTemplates.suboptimal ||
            `Path exists but could be optimized: ${pathConfig.name}`,
          relatedTo: pathConfig.id,
        });
        const allowPartial = pathConfig.required && !pathConfig.isBonus;
        if (allowPartial) {
          score += pathConfig.weight * 0.5; // Partial credit
        }
      }
    }

    return { score, bonusScore, bonusMax, blocking, warnings, positive };
  }

  /**
   * Find all paths from start components to end components
   */
  private findPaths(nodes: PlacedNode[], edges: Edge[], config: CriticalPath): GraphPath[] {
    const paths: GraphPath[] = [];

    // Find all start nodes
    const startNodes = nodes.filter((node) => config.startComponents.includes(node.spec.kind));

    // Find all end nodes
    const endNodes = nodes.filter((node) => config.endComponents.includes(node.spec.kind));

    // BFS from each start node
    for (const startNode of startNodes) {
      for (const endNode of endNodes) {
        const path = this.bfsPath(nodes, edges, startNode, endNode, config);
        if (path) {
          paths.push(path);
        }
      }
    }

    return paths;
  }

  /**
   * BFS to find path between two nodes
   */
  private bfsPath(
    nodes: PlacedNode[],
    edges: Edge[],
    start: PlacedNode,
    end: PlacedNode,
    config: CriticalPath
  ): GraphPath | null {
    const queue: Array<{ node: PlacedNode; path: PathNode[]; visitedEdges: Edge[] }> = [
      {
        node: start,
        path: [{ nodeId: start.id, componentKind: start.spec.kind, depth: 0 }],
        visitedEdges: [],
      },
    ];

    const visited = new Set<string>([start.id]);

    while (queue.length > 0) {
      const { node, path, visitedEdges } = queue.shift()!;

      // Found the end node
      if (node.id === end.id) {
        const valid = this.validatePath(path, visitedEdges, config);
        return {
          nodes: path,
          edges: visitedEdges,
          length: path.length,
          valid,
        };
      }

      // Check max hops
      if (config.maxHops && path.length >= config.maxHops) {
        continue;
      }

      // Find neighbors
      const neighbors = edges.filter((edge) => edge.from === node.id || edge.to === node.id);

      for (const edge of neighbors) {
        const nextNodeId = edge.from === node.id ? edge.to : edge.from;
        const nextNode = nodes.find((n) => n.id === nextNodeId);

        if (nextNode && !visited.has(nextNode.id)) {
          visited.add(nextNode.id);
          queue.push({
            node: nextNode,
            path: [
              ...path,
              { nodeId: nextNode.id, componentKind: nextNode.spec.kind, depth: path.length },
            ],
            visitedEdges: [...visitedEdges, edge],
          });
        }
      }
    }

    return null;
  }

  /**
   * Validate path against requirements
   */
  private validatePath(path: PathNode[], edges: Edge[], config: CriticalPath): boolean {
    const componentKinds = path.map((p) => p.componentKind);

    // Check mustInclude
    for (const required of config.mustInclude) {
      if (!componentKinds.includes(required)) {
        return false;
      }
    }

    // Check mustNotInclude (forbidden connections)
    if (config.mustNotInclude) {
      for (const forbidden of config.mustNotInclude) {
        if (componentKinds.includes(forbidden)) {
          return false;
        }
      }
    }

    // Check hop count
    if (config.minHops && path.length < config.minHops) {
      return false;
    }

    if (config.maxHops && path.length > config.maxHops) {
      return false;
    }

    return true;
  }

  /**
   * Select the best path from multiple options
   */
  private selectBestPath(paths: GraphPath[], _config: CriticalPath): GraphPath {
    // Prefer valid paths
    const validPaths = paths.filter((p) => p.valid);
    if (validPaths.length > 0) {
      // Select shortest valid path
      return validPaths.reduce((best, current) => (current.length < best.length ? current : best));
    }

    // Return shortest invalid path
    return paths.reduce((best, current) => (current.length < best.length ? current : best));
  }

  /**
   * Evaluate architecture patterns
   */
  private evaluateArchitecturePatterns(
    nodes: PlacedNode[],
    edges: Edge[],
    patterns: ArchitecturePattern[],
    functionalReqs: Record<string, boolean>,
    nfrValues: DesignScoringInput["nfrValues"]
  ): {
    score: number;
    bonusScore: number;
    bonusMax: number;
    blocking: FeedbackItem[];
    warnings: FeedbackItem[];
    positive: FeedbackItem[];
  } {
    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    let score = 0;
    let bonusScore = 0;
    let bonusMax = 0;

    for (const pattern of patterns) {
      if (pattern.isBonus) {
        bonusMax += pattern.weight;
      }
      // Check if pattern is triggered
      const isTriggered = this.isPatternTriggered(pattern, functionalReqs, nfrValues);
      if (!isTriggered && !pattern.required) {
        continue;
      }

      // Check if pattern is implemented
      const implemented = this.checkPatternImplementation(nodes, edges, pattern);

      if (implemented.success) {
        if (pattern.isBonus) {
          bonusScore += pattern.weight;
          bonusMax += pattern.weight;
        } else {
          score += pattern.weight;
        }
        positive.push({
          category: "architecture",
          severity: "positive",
          message: pattern.feedbackTemplates.present,
          relatedTo: pattern.id,
        });
      } else if (isTriggered || pattern.required) {
        const severity: "blocking" | "warning" = pattern.required ? "blocking" : "warning";
        const message = implemented.incorrect
          ? pattern.feedbackTemplates.incorrect || pattern.feedbackTemplates.missing
          : pattern.feedbackTemplates.missing;

        (severity === "blocking" ? blocking : warnings).push({
          category: "architecture",
          severity,
          message,
          relatedTo: pattern.id,
          actionable: pattern.description,
        });
      }
    }

    return { score, bonusScore, bonusMax, blocking, warnings, positive };
  }

  /**
   * Check if pattern conditions are met
   */
  private isPatternTriggered(
    pattern: ArchitecturePattern,
    functionalReqs: Record<string, boolean>,
    nfrValues: DesignScoringInput["nfrValues"]
  ): boolean {
    // If no triggeredBy defined, pattern is always triggered (relies on required flag)
    if (!pattern.triggeredBy) {
      return true;
    }

    // Check functional requirements
    if (pattern.triggeredBy.functionalReqs) {
      const hasFunctionalReq = pattern.triggeredBy.functionalReqs.some(
        (reqId) => functionalReqs[reqId] === true
      );
      if (hasFunctionalReq) return true;
    }

    // Check NFR thresholds
    if (pattern.triggeredBy.nfrThresholds) {
      for (const [key, threshold] of Object.entries(pattern.triggeredBy.nfrThresholds)) {
        const value = (nfrValues as Record<string, unknown>)[key];
        if (typeof value === "number" && value >= threshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if pattern is properly implemented
   */
  private checkPatternImplementation(
    nodes: PlacedNode[],
    edges: Edge[],
    pattern: ArchitecturePattern
  ): { success: boolean; incorrect: boolean } {
    // Helper to match component kind including alternatives
    const matchesKind = (nodeKind: string, targetKind: string): boolean => {
      if (nodeKind === targetKind) return true;

      // Check if base types match (e.g., "DB (Postgres)" matches "DB (MySQL)")
      const baseTarget = targetKind.split(" ")[0];
      const baseNode = nodeKind.split(" ")[0];

      return baseTarget === baseNode;
    };

    // Check required components exist (respecting duplicate requirements)
    const requiredCounts: Record<string, number> = {};
    for (const requiredKind of pattern.requiredComponents) {
      requiredCounts[requiredKind] = (requiredCounts[requiredKind] || 0) + 1;
    }

    for (const [requiredKind, count] of Object.entries(requiredCounts)) {
      const matches = nodes.filter((node) => matchesKind(node.spec.kind, requiredKind));
      if (matches.length < count) {
        return { success: false, incorrect: false };
      }
    }

    // Check required connections exist
    for (const connection of pattern.requiredConnections) {
      const hasConnection = this.checkConnection(nodes, edges, connection);
      if (!hasConnection) {
        return { success: false, incorrect: false };
      }
    }

    // Check forbidden connections don't exist
    if (pattern.forbiddenConnections) {
      for (const forbidden of pattern.forbiddenConnections) {
        const hasForbidden = this.checkConnection(nodes, edges, forbidden);
        if (hasForbidden) {
          return { success: false, incorrect: true };
        }
      }
    }

    return { success: true, incorrect: false };
  }

  /**
   * Check if a connection exists between component types
   * Uses shared bidirectional connection logic from utils.ts
   * Now treats ALL connections as bidirectional to match simulation behavior
   * OPTIMIZED: Uses cache to avoid repeated BFS traversals
   */
  private checkConnection(
    nodes: PlacedNode[],
    edges: Edge[],
    connection: ArchitecturePattern["requiredConnections"][0]
  ): boolean {
    // Create cache key (bidirectional, so normalize order)
    const cacheKey = [connection.from, connection.to].sort().join("→");

    // Check cache first
    if (this.connectionCache.has(cacheKey)) {
      return this.connectionCache.get(cacheKey)!;
    }

    // Use shared connection checker (always bidirectional)
    const hasConnection = hasConnectionBetweenKinds(nodes, edges, connection.from, connection.to);

    // Cache result
    this.connectionCache.set(cacheKey, hasConnection);

    return hasConnection;
  }
}

/**
 * Convenience function to evaluate design
 */
export function evaluateDesign(
  input: DesignScoringInput,
  config: DesignScoringConfig
): FeedbackResult {
  const engine = new DesignScoringEngine();
  return engine.evaluate(input, config);
}
