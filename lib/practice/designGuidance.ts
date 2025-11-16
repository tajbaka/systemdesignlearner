import type { PracticeDesignState } from "./types";
import type { ComponentKind } from "@/app/components/types";
import { hasConnectionBetweenKinds } from "@/app/components/utils";

type GuidanceLevel = "core" | "bonus";

export type DesignGuidance = {
  id: string;
  level: GuidanceLevel;
  summary: string;
  question: string;
};

const DB_KIND: ComponentKind = "DB (Postgres)";
const CACHE_KIND: ComponentKind = "Cache (Redis)";

const matchesKind = (nodeKind: string, targetKind: string) => {
  if (nodeKind === targetKind) return true;
  const baseTarget = targetKind.split(" ")[0];
  const baseNode = nodeKind.split(" ")[0];
  return baseTarget === baseNode;
};

const hasKind = (design: PracticeDesignState, kind: ComponentKind | string) =>
  design.nodes.some((node) => matchesKind(node.spec.kind, kind));

const hasConnection = (
  design: PracticeDesignState,
  from: ComponentKind | string,
  to: ComponentKind | string
) => hasConnectionBetweenKinds(design.nodes, design.edges, from, to);

const hasSecondService = (design: PracticeDesignState) =>
  design.nodes.filter((node) => node.spec.kind === "Service").length >= 2;

const hasCacheNode = (design: PracticeDesignState) =>
  design.nodes.some((node) => matchesKind(node.spec.kind, CACHE_KIND));

const getServiceNodes = (design: PracticeDesignState) =>
  design.nodes.filter((node) => node.spec.kind === "Service");

const nodeConnectedToKind = (
  design: PracticeDesignState,
  nodeId: string,
  kind: ComponentKind | string
) => {
  const targetIds = design.nodes
    .filter((node) => matchesKind(node.spec.kind, kind))
    .map((node) => node.id);
  if (targetIds.length === 0) return false;
  return design.edges.some(
    (edge) =>
      (edge.from === nodeId && targetIds.includes(edge.to)) ||
      (edge.to === nodeId && targetIds.includes(edge.from))
  );
};

export function evaluateDesignGuidance(design: PracticeDesignState): DesignGuidance | null {
  const hasWeb = hasKind(design, "Web");
  if (!hasWeb) {
    return {
      id: "add-web",
      level: "core",
      summary: "Start with a client/Web node so requests have an entry point.",
      question: "Where do requests originate from in the current diagram?",
    };
  }

  const hasApiGateway = hasKind(design, "API Gateway");
  if (!hasApiGateway) {
    return {
      id: "add-api-gateway",
      level: "core",
      summary: "Clients need an API Gateway to handle routing, auth, and rate limiting.",
      question:
        "What component sits between users and backend services to terminate HTTP, enforce auth, and route traffic?",
    };
  }

  const webToApiConnected = hasConnection(design, "Web", "API Gateway");
  if (!webToApiConnected) {
    return {
      id: "connect-web-api",
      level: "core",
      summary:
        "Connect the Web client to the API Gateway so requests can actually reach your backend.",
      question: "How does traffic flow from the Web client into the API Gateway at the moment?",
    };
  }

  const hasService = hasKind(design, "Service");
  if (!hasService) {
    return {
      id: "add-service",
      level: "core",
      summary: "A Service layer is required to handle URL creation and redirect logic.",
      question:
        "After the API Gateway, which component should execute the URL creation and redirect logic?",
    };
  }

  const apiToServiceConnected = hasConnection(design, "API Gateway", "Service");
  if (!apiToServiceConnected) {
    return {
      id: "connect-api-service",
      level: "core",
      summary: "Wire the API Gateway to your Service so requests continue through the stack.",
      question: "How are requests moving from the API Gateway into the Service layer right now?",
    };
  }

  const hasDatabase = hasKind(design, DB_KIND);
  if (!hasDatabase) {
    return {
      id: "add-database",
      level: "core",
      summary: "URL mappings need durable storage. Add a primary database (Postgres is fine).",
      question: "Where will the platform persist the short-to-long URL mappings for durability?",
    };
  }

  const serviceToDbConnected = hasConnection(design, "Service", DB_KIND);
  if (!serviceToDbConnected) {
    return {
      id: "connect-service-db",
      level: "core",
      summary: "Connect the Service to the database so it can store and fetch URL records.",
      question:
        "How does the Service reach the database for reads and writes in the current layout?",
    };
  }

  // Core path satisfied; start bonus guidance
  if (!hasSecondService(design)) {
    return {
      id: "add-second-service",
      level: "bonus",
      summary:
        "Split read-heavy redirects from write operations so you can scale each path independently.",
      question:
        "Right now one Service handles both shortening URLs and redirecting clicks. How could adding a separate redirect Service lighten the work on the write Service?",
    };
  }

  if (!hasCacheNode(design)) {
    return {
      id: "add-cache",
      level: "bonus",
      summary:
        "A Redis/Memcached layer offloads hot redirects from the database and keeps p95 < 100ms.",
      question:
        "What in-memory cache would reduce database load for hot redirects while keeping latency low?",
    };
  }

  const serviceToCacheConnected = hasConnection(design, "Service", CACHE_KIND);
  if (!serviceToCacheConnected) {
    return {
      id: "connect-service-cache",
      level: "bonus",
      summary:
        "Remember to connect the Service to cache first and fall back to the database on a miss.",
      question:
        "If cache is present, how does the Service reach it before falling back to the database?",
    };
  }

  const serviceNodes = getServiceNodes(design);
  const cacheServiceMissingDb = serviceNodes.some(
    (node) =>
      nodeConnectedToKind(design, node.id, CACHE_KIND) &&
      !nodeConnectedToKind(design, node.id, DB_KIND)
  );
  if (cacheServiceMissingDb) {
    return {
      id: "cache-service-db",
      level: "bonus",
      summary:
        "The Service that talks to cache also needs a direct path to the database for cache misses.",
      question:
        "The Service feeding cache still needs a fallback—can it also reach the database when a slug is missing?",
    };
  }

  const renamedServices =
    serviceNodes.length >= 2 &&
    serviceNodes.every(
      (node) => typeof node.customLabel === "string" && node.customLabel.trim().length > 0
    ) &&
    new Set(serviceNodes.map((node) => node.customLabel!.trim())).size >= 2;

  if (!renamedServices) {
    return {
      id: "rename-services",
      level: "bonus",
      summary:
        "Naming each Service after its role (e.g., Shorten vs Redirect) makes the diagram clearer.",
      question:
        "Can you rename the Services so it's obvious which one handles shortening and which one handles redirects?",
    };
  }

  return null;
}
