"use client";

import { useState, useMemo } from "react";
import { stepStateStore } from "../store/store";
import useStepStore from "../store/useStore";
import { useActionHandler } from "./useActionHandler";
import type { HttpMethod } from "../api-design/components/MethodSelect";
import type { ProblemConfig, ApiSolution, EndpointApiRequirement, DesignSolution } from "../types";
import type { PracticeDesignState, PlacedNode, Edge } from "../high-level-design/types";

type UseSolutionRevealProps = {
  slug: string;
  stepType: string | null;
  config: ProblemConfig;
  onInsertComplete?: () => void;
};

// Helper to check if a solution is an ApiSolution
function isApiSolution(solution: unknown): solution is ApiSolution {
  return (
    !!solution &&
    typeof solution === "object" &&
    "overview" in solution &&
    "request" in solution &&
    "response" in solution
  );
}

// Helper to check if a requirement is an EndpointApiRequirement
function isEndpointApiRequirement(requirement: unknown): requirement is EndpointApiRequirement {
  return (
    !!requirement &&
    typeof requirement === "object" &&
    "scope" in requirement &&
    requirement.scope === "endpoint" &&
    "method" in requirement &&
    "correctPath" in requirement
  );
}

// Helper to check if a method string is a valid HttpMethod
function isValidHttpMethod(method: string): method is HttpMethod {
  return ["GET", "POST", "PATCH", "DELETE"].includes(method);
}

// Helper to format API solution into readable text
function formatApiSolution(solution: ApiSolution): string {
  const parts: string[] = [];

  if (solution.overview) {
    parts.push(solution.overview);
  }

  if (solution.request) {
    parts.push(`\nRequest: ${solution.request}`);
  }

  if (solution.response) {
    parts.push(`\nResponse (${solution.response.statusCode}): ${solution.response.text}`);
  }

  if (solution.errors && solution.errors.length > 0) {
    parts.push("\nError Codes:");
    solution.errors.forEach((error) => {
      parts.push(`- ${error.statusCode}: ${error.text}`);
    });
  }

  return parts.join("\n");
}

export function useSolutionReveal({
  slug,
  stepType,
  config,
  onInsertComplete,
}: UseSolutionRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const handlers = useActionHandler(slug);

  // Get attempts from store for current step (reactive)
  const { functionalRequirements, nonFunctionalRequirements, apiDesign, highLevelDesign } =
    useStepStore(slug);

  let attempts = 0;
  if (stepType === "functional") {
    attempts = functionalRequirements.attempts ?? 0;
  } else if (stepType === "nonFunctional") {
    attempts = nonFunctionalRequirements.attempts ?? 0;
  } else if (stepType === "api") {
    attempts = apiDesign.attempts ?? 0;
  } else if (stepType === "highLevelDesign") {
    attempts = highLevelDesign.attempts ?? 0;
  }

  // Get solution text from config based on step type
  const solutionText = useMemo(() => {
    if (!stepType) {
      return "";
    }

    if (stepType === "functional" && config.steps.functional) {
      // Get all requirements with solutions and combine them
      const requirementsWithSolutions =
        config.steps.functional.requirements?.filter(
          (req) => req.solutions && req.solutions.length > 0
        ) || [];

      if (requirementsWithSolutions.length > 0) {
        const formattedSolutions = requirementsWithSolutions.map((req, index) => {
          const solution = req.solutions?.[0];
          if (!solution) return "";

          let solutionText = "";

          // Add numbered label
          if (req.label) {
            solutionText += `${index + 1}. ${req.label}: `;
          } else {
            solutionText += `${index + 1}. `;
          }

          if (typeof solution === "object" && "text" in solution) {
            solutionText += solution.text;
          }

          return solutionText;
        });

        return formattedSolutions.filter(Boolean).join("\n\n");
      }
    } else if (stepType === "nonFunctional" && config.steps.nonFunctional) {
      // Get all requirements with solutions and combine them
      const requirementsWithSolutions =
        config.steps.nonFunctional.requirements?.filter(
          (req) => req.solutions && req.solutions.length > 0
        ) || [];

      if (requirementsWithSolutions.length > 0) {
        const formattedSolutions = requirementsWithSolutions.map((req, index) => {
          const solution = req.solutions?.[0];
          if (!solution) return "";

          let solutionText = "";

          // Add numbered label
          if (req.label) {
            solutionText += `${index + 1}. ${req.label}: `;
          } else {
            solutionText += `${index + 1}. `;
          }

          if (typeof solution === "object" && "text" in solution) {
            solutionText += solution.text;
          }

          return solutionText;
        });

        return formattedSolutions.filter(Boolean).join("\n\n");
      }
    } else if (stepType === "api" && config.steps.api) {
      // Get all endpoint requirements with solutions
      const requirementsWithSolutions =
        config.steps.api.requirements?.filter((req) => req.solutions && req.solutions.length > 0) ||
        [];

      if (requirementsWithSolutions.length > 0) {
        const formattedSolutions = requirementsWithSolutions.map((req, index) => {
          const solution = req.solutions?.[0];
          if (!solution) return "";

          let solutionText = "";

          // Add endpoint label
          if (req.label) {
            solutionText += `${index + 1}. ${req.label}\n`;
          }

          if (isApiSolution(solution)) {
            solutionText += formatApiSolution(solution);
          } else if (typeof solution === "object" && "text" in solution) {
            solutionText += solution.text;
          }

          return solutionText;
        });

        return formattedSolutions.filter(Boolean).join("\n\n");
      }
    } else if (stepType === "highLevelDesign" && config.steps.highLevelDesign?.requirements?.[0]) {
      return "The reference diagram will be added to your design board.";
    }

    return "";
  }, [stepType, config]);

  // Solution diagram for high-level design (nodes with layout + edges)
  const solutionDesign = useMemo((): PracticeDesignState | null => {
    if (stepType !== "highLevelDesign" || !config.steps.highLevelDesign?.requirements?.[0]) {
      return null;
    }
    const requirement: DesignSolution = config.steps.highLevelDesign.requirements[0];
    const configNodes = requirement.nodes ?? [];
    const configEdges = requirement.edges ?? [];

    // Layout: left to right, then next row
    const HORIZONTAL_STEP = 320;
    const VERTICAL_STEP = 240;
    const START_X = 80;
    const START_Y = 80;
    const PER_ROW = 3;

    const nodes: PlacedNode[] = configNodes.map((node, i) => ({
      id: node.id,
      type: node.type,
      name: node.name,
      x: START_X + (i % PER_ROW) * HORIZONTAL_STEP,
      y: START_Y + Math.floor(i / PER_ROW) * VERTICAL_STEP,
    }));

    const edges: Edge[] = configEdges.map((e) => ({
      id: `${e.from}-${e.to}`,
      from: e.from,
      to: e.to,
    }));

    return { nodes, edges };
  }, [stepType, config]);

  const shouldShow =
    attempts > 2 &&
    (stepType === "highLevelDesign" ? solutionDesign !== null : solutionText !== "");

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleInsert = () => {
    // Insert based on step type using the action handler
    if (stepType === "highLevelDesign" && solutionDesign) {
      handlers.highLevelDesign("insert", solutionDesign);
    } else if (stepType === "functional") {
      handlers.functional("insert", solutionText);
    } else if (stepType === "nonFunctional") {
      handlers.nonFunctional("insert", solutionText);
    } else if (stepType === "api") {
      // For API, prepare the updated endpoints
      const store = stepStateStore.getState();
      const problemState = store.getProblemState(slug);
      const stepConfig = config.steps.api;

      if (!stepConfig?.requirements) return;

      // Get all requirements with solutions
      const requirementsWithSolutions = stepConfig.requirements.filter(
        (req) => req.solutions && req.solutions.length > 0
      );

      if (requirementsWithSolutions.length === 0) return;

      const endpoints = problemState.apiDesign.endpoints;
      const updatedEndpoints = [...endpoints];

      // Update existing endpoints with corresponding solutions
      for (let i = 0; i < requirementsWithSolutions.length; i++) {
        const requirement = requirementsWithSolutions[i];
        const solution = requirement.solutions?.[0];

        if (!solution) continue;

        let textToInsert = "";

        if (isApiSolution(solution)) {
          textToInsert = formatApiSolution(solution);
        } else if (typeof solution === "object" && "text" in solution) {
          textToInsert = solution.text;
        }

        // If we need to create a new endpoint (more solutions than existing endpoints)
        if (i >= endpoints.length) {
          const baseId = crypto.randomUUID();

          // Get method value, ensuring it's a valid HttpMethod
          let methodValue: HttpMethod = "GET";
          if (isEndpointApiRequirement(requirement) && isValidHttpMethod(requirement.method)) {
            methodValue = requirement.method;
          }

          const newEndpoint = {
            id: `endpoint-${baseId}`,
            value: "",
            method: {
              id: `method-${baseId}`,
              value: methodValue,
            },
            path: {
              id: `path-${baseId}`,
              value: isEndpointApiRequirement(requirement)
                ? requirement.correctPath.startsWith("/")
                  ? requirement.correctPath.slice(1)
                  : requirement.correctPath
                : "",
            },
            description: {
              id: `description-${baseId}`,
              value: textToInsert,
            },
          };
          updatedEndpoints.push(newEndpoint);
        } else {
          // Update existing endpoint
          const endpoint = updatedEndpoints[i];
          const updatedEndpoint = {
            ...endpoint,
            description: {
              ...endpoint.description,
              value: textToInsert,
            },
          };

          // If this is an endpoint requirement, also update path and method
          if (isEndpointApiRequirement(requirement)) {
            // Remove leading slash from path if present
            const pathValue = requirement.correctPath.startsWith("/")
              ? requirement.correctPath.slice(1)
              : requirement.correctPath;

            updatedEndpoint.path = {
              ...endpoint.path,
              value: pathValue,
            };

            // Only update method if it's a valid HttpMethod
            if (isValidHttpMethod(requirement.method)) {
              updatedEndpoint.method = {
                ...endpoint.method,
                value: requirement.method,
              };
            }
          }

          updatedEndpoints[i] = updatedEndpoint;
        }
      }

      // Use the action handler to set the updated endpoints
      handlers.api("insert", updatedEndpoints);
    }

    // Close the modal after inserting (for all step types including highLevelDesign)
    if (onInsertComplete) {
      onInsertComplete();
    }
  };

  return {
    isRevealed,
    shouldShow,
    solutionText,
    handleReveal,
    handleInsert,
  };
}
