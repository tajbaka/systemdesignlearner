"use client";

import { useEffect, useState } from "react";
import { buildAdjacencyList, type AdjacencyList } from "@/domains/practice/lib/adjacencyListUtils";

type ComponentsConfig = {
  nodes?: Array<{ id: string; type: string }>;
  edges?: Array<{ from: string; to: string; protocol?: string; op?: string }>;
};

/**
 * Custom hook to create an adjacency list from scoring config solution
 * @param config - The scoring config containing highLevelDesign.solutions
 * @returns The adjacency list mapping node names to their connections
 */
export function useAdjacencyList(components: ComponentsConfig): AdjacencyList {
  const [adjacencyList, setAdjacencyList] = useState<AdjacencyList>({});

  useEffect(() => {
    const result = buildAdjacencyList(components);
    setAdjacencyList(result);
  }, [components]);

  return adjacencyList;
}
