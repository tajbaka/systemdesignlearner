import type { ProblemConfig } from "@/domains/practice/back-end/types";
import type { EvaluationStrategy, EvaluationResult } from "../types";
import {
  buildAdjacencyList,
  buildNodesMap,
  findValidMapping,
  findBestPartialMapping,
  evaluateWithMapping,
  evaluateWithPartialMapping,
  evaluatePartialMatch,
} from "@/domains/practice/back-end/high-level-design/helpers";
import type { PracticeDesignState } from "@/domains/practice/back-end/high-level-design/types";
import { z } from "zod";
import { logger } from "@/lib/logger";

const HighLevelDesignInputSchema = z.object({
  diagram: z.unknown().nullable(),
});

type HighLevelDesignInput = z.infer<typeof HighLevelDesignInputSchema>;

export const highLevelDesignStrategy: EvaluationStrategy<HighLevelDesignInput> = {
  validate(input: unknown): HighLevelDesignInput {
    return HighLevelDesignInputSchema.parse(input);
  },

  buildPrompt(_config: ProblemConfig, _userInput: HighLevelDesignInput): string {
    // High-level design doesn't use AI prompts - evaluation is done algorithmically
    return "";
  },

  parseResponse(
    _responseText: string,
    config: ProblemConfig,
    userInput: HighLevelDesignInput
  ): EvaluationResult {
    const diagram = userInput.diagram as PracticeDesignState | null;

    logger.info("[HLD Eval] Raw user diagram:", JSON.stringify(diagram, null, 2));

    // Get solution from config - access as object property
    // Note: config.steps is typed as array but actually used as object in configs
    const highLevelDesignStep = (config.steps as unknown as Record<string, unknown>)
      .highLevelDesign as { requirements?: unknown[] } | undefined;
    if (!highLevelDesignStep?.requirements?.[0]) {
      return {
        feedback: "No solution available for evaluation",
        score: 0,
        results: [],
      };
    }

    const userAdjacencyList = buildAdjacencyList(diagram);
    const userNodesMap = buildNodesMap(diagram);
    const solution = highLevelDesignStep.requirements[0] as PracticeDesignState;
    const solutionAdjacencyList = buildAdjacencyList(solution);
    const solutionNodesMap = buildNodesMap(solution);

    // Debug logging
    logger.info(
      "[HLD Eval] User nodes:",
      Object.entries(userNodesMap).map(([id, node]) => ({ id, type: node.type }))
    );
    logger.info(
      "[HLD Eval] User adjacency:",
      Object.entries(userAdjacencyList).map(([from, edges]) => ({
        from,
        to: edges.map((e) => e.to),
      }))
    );
    logger.info(
      "[HLD Eval] Solution nodes:",
      Object.entries(solutionNodesMap).map(([id, node]) => ({ id, type: node.type }))
    );
    logger.info(
      "[HLD Eval] Solution adjacency:",
      Object.entries(solutionAdjacencyList).map(([from, edges]) => ({
        from,
        to: edges.map((e) => e.to),
      }))
    );

    const mapping = findValidMapping(
      solutionNodesMap,
      solutionAdjacencyList,
      userNodesMap,
      userAdjacencyList
    );

    logger.info("[HLD Eval] Valid mapping result:", mapping ? Array.from(mapping.entries()) : null);

    let result;
    if (!mapping) {
      const partialMapping = findBestPartialMapping(
        solutionNodesMap,
        solutionAdjacencyList,
        userNodesMap,
        userAdjacencyList
      );

      logger.info("[HLD Eval] Partial mapping:", Array.from(partialMapping.entries()));

      if (partialMapping.size > 0) {
        result = evaluateWithPartialMapping(
          partialMapping,
          solutionAdjacencyList,
          userAdjacencyList,
          solutionNodesMap,
          userNodesMap
        );
      } else {
        const partialResult = evaluatePartialMatch(
          solutionAdjacencyList,
          userAdjacencyList,
          solutionNodesMap,
          userNodesMap
        );
        result = {
          ...partialResult,
          partialMapping: true,
        };
      }
    } else {
      result = evaluateWithMapping(
        mapping,
        solutionAdjacencyList,
        userAdjacencyList,
        solutionNodesMap,
        userNodesMap
      );
    }

    logger.info("[HLD Eval] Result:", {
      score: result.score,
      missingConnections: result.missingConnections,
      missingNodes: result.missingNodes,
    });

    // Transform to standardized EvaluationResult format
    const results: {
      id: string;
      complete: boolean;
      feedback?: string;
      hintId?: string;
      itemIds?: string[];
    }[] = [];

    // Get all solution edges with their metadata from the original solution
    const solutionEdgesData =
      (
        solution as {
          edges?: Array<{
            id: string;
            from: string;
            to: string;
            description?: string;
            hints?: Array<{ id: string; title: string; text: string; href?: string }>;
          }>;
        }
      ).edges || [];

    // Create a set of missing connection keys for quick lookup
    const missingConnectionKeys = new Set(
      result.missingConnections?.map((conn) => `${conn.from}-${conn.to}`) || []
    );

    logger.info("[HLD Eval] Missing connection keys:", Array.from(missingConnectionKeys));

    // Add result items for each solution edge (either complete or incomplete)
    solutionEdgesData.forEach((edge) => {
      const fromType = (solutionNodesMap[edge.from]?.type || edge.from).toLowerCase();
      const toType = (solutionNodesMap[edge.to]?.type || edge.to).toLowerCase();
      const connectionKey = `${fromType}-${toType}`;
      const isMissing = missingConnectionKeys.has(connectionKey);
      const primaryHint = edge.hints?.[0];

      logger.info("[HLD Eval] Checking edge:", {
        edgeId: edge.id,
        from: edge.from,
        to: edge.to,
        fromType,
        toType,
        connectionKey,
        isMissing,
      });

      results.push({
        id: edge.id,
        complete: !isMissing,
        feedback: edge.description || `${fromType} → ${toType}`,
        hintId: isMissing ? primaryHint?.id : undefined,
        itemIds: [edge.id],
      });
    });

    // Add extra connections as incomplete result items
    // Extra connections don't have hints since they're not in the solution
    if (result.extraConnections && result.extraConnections.length > 0) {
      result.extraConnections.forEach((connection, index) => {
        results.push({
          id: `extra-connection-${connection.from}-${connection.to}-${index}`,
          complete: false,
          feedback: `Extra connection that shouldn't be there: ${connection.from} → ${connection.to}`,
          itemIds: [`connection-${connection.from}-${connection.to}`],
        });
      });
    }

    // Add missing nodes as incomplete result items
    // Missing nodes indicate structural problems
    if (result.missingNodes && result.missingNodes.length > 0) {
      result.missingNodes.forEach((node, index) => {
        results.push({
          id: `missing-node-${node.type}-${index}`,
          complete: false,
          feedback: `Missing ${node.count} ${node.type} node${node.count > 1 ? "s" : ""}`,
          itemIds: [`node-type-${node.type}`],
        });
      });
    }

    return {
      feedback: "Evaluation complete.",
      score: result.score,
      results,
    };
  },
};
