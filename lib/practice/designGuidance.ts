import type { PracticeDesignState } from "./types";
import type { ComponentKind } from "@/app/components/types";
import { hasConnectionBetweenKinds } from "@/app/components/utils";
import type { GuidanceQuestion, GuidanceLevel, ScenarioReference } from "./reference/schema";
import { getScenarioReferenceSync } from "./loader";

export type DesignGuidance = {
  id: string;
  level: GuidanceLevel;
  summary: string;
  question: string;
};

const DB_KIND: ComponentKind = "DB (Postgres)";
const CACHE_KIND: ComponentKind = "Cache (Redis)";

/**
 * Look up a guidance question from the reference JSON by ID.
 * Falls back to hardcoded defaults if reference not loaded.
 */
function getQuestionFromReference(
  reference: ScenarioReference | null,
  id: string,
  defaultLevel: GuidanceLevel,
  defaultQuestion: string,
  defaultHint: string
): DesignGuidance {
  const questions = reference?.design?.guidance?.questions ?? [];
  const q = questions.find((question: GuidanceQuestion) => question.id === id);

  return {
    id,
    level: q?.level ?? defaultLevel,
    question: q?.question ?? defaultQuestion,
    summary: q?.hints?.[0] ?? defaultHint,
  };
}

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

/**
 * Evaluate the current design and return guidance for the next step.
 * Loads question text from the scenario reference JSON if available.
 *
 * @param design - The current design state
 * @param slug - Optional scenario slug to load reference from. Defaults to "url-shortener".
 */
export function evaluateDesignGuidance(
  design: PracticeDesignState,
  slug: string = "url-shortener"
): DesignGuidance | null {
  // Try to get reference from cache (preloaded)
  const reference = getScenarioReferenceSync(slug);

  const hasWeb = hasKind(design, "Web");
  if (!hasWeb) {
    return getQuestionFromReference(
      reference,
      "add-web",
      "core",
      "Where do requests originate from in the current diagram?",
      "Start with a client/Web node so requests have an entry point."
    );
  }

  const hasApiGateway = hasKind(design, "API Gateway");
  if (!hasApiGateway) {
    return getQuestionFromReference(
      reference,
      "add-api-gateway",
      "core",
      "What component sits between users and backend services to terminate HTTP, enforce auth, and route traffic?",
      "Clients need an API Gateway to handle routing, auth, and rate limiting."
    );
  }

  const webToApiConnected = hasConnection(design, "Web", "API Gateway");
  if (!webToApiConnected) {
    return getQuestionFromReference(
      reference,
      "connect-web-api",
      "core",
      "How does traffic flow from the Web client into the API Gateway at the moment?",
      "Connect the Web client to the API Gateway so requests can actually reach your backend."
    );
  }

  const hasService = hasKind(design, "Service");
  if (!hasService) {
    return getQuestionFromReference(
      reference,
      "add-service",
      "core",
      "After the API Gateway, which component should execute the URL creation and redirect logic?",
      "A Service layer is required to handle URL creation and redirect logic."
    );
  }

  const apiToServiceConnected = hasConnection(design, "API Gateway", "Service");
  if (!apiToServiceConnected) {
    return getQuestionFromReference(
      reference,
      "connect-api-service",
      "core",
      "How are requests moving from the API Gateway into the Service layer right now?",
      "Wire the API Gateway to your Service so requests continue through the stack."
    );
  }

  const hasDatabase = hasKind(design, DB_KIND);
  if (!hasDatabase) {
    return getQuestionFromReference(
      reference,
      "add-database",
      "core",
      "Where will the platform persist the short-to-long URL mappings for durability?",
      "URL mappings need durable storage. Add a primary database (Postgres is fine)."
    );
  }

  const serviceToDbConnected = hasConnection(design, "Service", DB_KIND);
  if (!serviceToDbConnected) {
    return getQuestionFromReference(
      reference,
      "connect-service-db",
      "core",
      "How does the Service reach the database for reads and writes in the current layout?",
      "Connect the Service to the database so it can store and fetch URL records."
    );
  }

  // Core path satisfied; start bonus guidance
  if (!hasSecondService(design)) {
    return getQuestionFromReference(
      reference,
      "add-second-service",
      "bonus",
      "Right now one Service handles both shortening URLs and redirecting clicks. How could adding a separate redirect Service lighten the work on the write Service?",
      "Split read-heavy redirects from write operations so you can scale each path independently."
    );
  }

  if (!hasCacheNode(design)) {
    return getQuestionFromReference(
      reference,
      "add-cache",
      "bonus",
      "What in-memory cache would reduce database load for hot redirects while keeping latency low?",
      "A Redis/Memcached layer offloads hot redirects from the database and keeps p95 < 100ms."
    );
  }

  const serviceToCacheConnected = hasConnection(design, "Service", CACHE_KIND);
  if (!serviceToCacheConnected) {
    return getQuestionFromReference(
      reference,
      "connect-service-cache",
      "bonus",
      "If cache is present, how does the Service reach it before falling back to the database?",
      "Remember to connect the Service to cache first and fall back to the database on a miss."
    );
  }

  const serviceNodes = getServiceNodes(design);
  const cacheServiceMissingDb = serviceNodes.some(
    (node) =>
      nodeConnectedToKind(design, node.id, CACHE_KIND) &&
      !nodeConnectedToKind(design, node.id, DB_KIND)
  );
  if (cacheServiceMissingDb) {
    return getQuestionFromReference(
      reference,
      "cache-service-db",
      "bonus",
      "The Service feeding cache still needs a fallback—can it also reach the database when a slug is missing?",
      "The Service that talks to cache also needs a direct path to the database for cache misses."
    );
  }

  const renamedServices =
    serviceNodes.length >= 2 &&
    serviceNodes.every(
      (node) => typeof node.customLabel === "string" && node.customLabel.trim().length > 0
    ) &&
    new Set(serviceNodes.map((node) => node.customLabel!.trim())).size >= 2;

  if (!renamedServices) {
    return getQuestionFromReference(
      reference,
      "rename-services",
      "bonus",
      "Can you rename the Services so it's obvious which one handles shortening and which one handles redirects?",
      "Naming each Service after its role (e.g., Shorten vs Redirect) makes the diagram clearer."
    );
  }

  return null;
}
