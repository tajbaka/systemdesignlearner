import type { PlacedNode, Edge } from "@/domains/practice/types";
import type { ComponentKind } from "@/domains/practice/types";
import { ALLOWED_COMPONENTS_LIST } from "@/domains/practice/constants";

/**
 * Reverse ALLOWED_COMPONENTS_LIST to get ComponentKind -> type mapping
 */
function getComponentKindToType(): Record<ComponentKind, string> {
  const result: Partial<Record<ComponentKind, string>> = {};
  for (const [type, config] of Object.entries(ALLOWED_COMPONENTS_LIST)) {
    // Skip "object-store" as it's a special case (maps to same as "storage")
    if (type === "object-store") continue;
    result[config.kind] = type;
  }
  return result as Record<ComponentKind, string>;
}

const COMPONENT_KIND_TO_TYPE = getComponentKindToType();

type ComponentsConfig = {
  nodes?: Array<{ id: string; type: string }>;
  edges?: Array<{ from: string; to: string; protocol?: string; op?: string }>;
};

/**
 * Get node ID from PlacedNode for components config
 * TODO: Reimplement without spec/customLabel
 */
const getNodeId = (node: PlacedNode, serviceIndexMap: Map<string, number>): string => {
  // Infer kind from node ID if it follows pattern "node-{kind}-{id}"
  const match = node.id.match(/^node-([^-]+)-/);
  if (match) {
    const kind = match[1];
    if (kind === "Service") {
      const currentIndex = serviceIndexMap.get("Service") || 0;
      serviceIndexMap.set("Service", currentIndex + 1);
      return `Service${currentIndex + 1}`;
    }
    return kind;
  }
  return node.id;
};

/**
 * Determine protocol/op for an edge based on component types and context
 * TODO: Reimplement without spec.kind
 */
const getEdgeProperties = (
  fromNode: PlacedNode,
  toNode: PlacedNode
): { protocol?: string; op?: string } => {
  // Infer kind from node ID
  const fromMatch = fromNode.id.match(/^node-([^-]+)-/);
  const toMatch = toNode.id.match(/^node-([^-]+)-/);
  const fromKind = fromMatch ? fromMatch[1] : "";
  const toKind = toMatch ? toMatch[1] : "";

  // HTTP-based connections
  if (
    fromKind === "Web" ||
    fromKind === "API Gateway" ||
    fromKind === "Service" ||
    toKind === "API Gateway" ||
    toKind === "Service"
  ) {
    return { protocol: "HTTP" };
  }

  return {};
};

/**
 * Convert user's design (nodes and edges) to components config format
 * This matches the structure in url-shortener.json (259-276)
 */
export function designToComponents(nodes: PlacedNode[], edges: Edge[]): ComponentsConfig {
  // Create a map of node IDs to PlacedNodes for quick lookup
  const nodeMap = new Map<string, PlacedNode>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Track service indices to assign Service1, Service2, etc.
  const serviceIndexMap = new Map<string, number>();

  // First pass: create a map of original node IDs to component IDs
  const nodeIdMap = new Map<string, string>();
  nodes.forEach((node) => {
    const componentId = getNodeId(node, serviceIndexMap);
    nodeIdMap.set(node.id, componentId);
  });

  // Convert nodes
  const componentsNodes = nodes.map((node) => {
    const nodeId = nodeIdMap.get(node.id)!;
    // Infer kind from node ID
    const match = node.id.match(/^node-([^-]+)-/);
    const kind = match ? match[1] : "unknown";
    const type = COMPONENT_KIND_TO_TYPE[kind as ComponentKind] || "unknown";
    return {
      id: nodeId,
      type,
    };
  });

  // Convert edges
  const componentsEdges = edges
    .map((edge) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);

      if (!fromNode || !toNode) {
        // Skip edges where nodes don't exist
        return null;
      }

      const fromId = nodeIdMap.get(edge.from)!;
      const toId = nodeIdMap.get(edge.to)!;
      const properties = getEdgeProperties(fromNode, toNode);

      return {
        from: fromId,
        to: toId,
        ...properties,
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);

  return {
    nodes: componentsNodes,
    edges: componentsEdges,
  };
}
