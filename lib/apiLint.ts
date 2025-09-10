import type { Scenario } from "@/lib/scenarios";

export function lintApi(scenario: Scenario): string[] {
  const msgs: string[] = [];
  if (!scenario.api || scenario.api.length === 0) return msgs;

  for (const endpoint of scenario.api) {
    // Path should start with "/"
    if (!endpoint.path.startsWith("/")) {
      msgs.push(`Path "${endpoint.path}" should start with "/".`);
    }

    // Avoid trailing slash
    if (endpoint.path.endsWith("/") && endpoint.path !== "/") {
      msgs.push(`Avoid trailing slash in "${endpoint.path}".`);
    }

    // Search endpoints should include query param "q"
    if (endpoint.method === "GET" && endpoint.path.includes("/search") && !endpoint.query?.includes("q")) {
      msgs.push(`Search endpoint "${endpoint.path}" should include query param "q".`);
    }

    // List endpoints should have pagination params
    if (endpoint.method === "GET" && !endpoint.path.includes("/:") && !endpoint.query?.some(q => ["limit", "offset", "page"].includes(q))) {
      msgs.push(`List endpoint "${endpoint.path}" should include pagination params (limit, offset, or page).`);
    }

    // POST endpoints should have body shape
    if (endpoint.method === "POST" && !endpoint.bodyShape) {
      msgs.push(`POST endpoint "${endpoint.path}" should specify body shape.`);
    }

    // Path should use nouns, not verbs
    const pathParts = endpoint.path.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !lastPart.startsWith(":") && isVerb(lastPart)) {
      msgs.push(`Path "${endpoint.path}" should use nouns, not verbs. Consider restructuring.`);
    }

    // Suggest proper HTTP methods for CRUD operations
    if (endpoint.path.includes("/create") && endpoint.method !== "POST") {
      msgs.push(`Create operation "${endpoint.path}" should use POST method.`);
    }
    if (endpoint.path.includes("/update") && !["PUT", "PATCH"].includes(endpoint.method)) {
      msgs.push(`Update operation "${endpoint.path}" should use PUT or PATCH method.`);
    }
    if (endpoint.path.includes("/delete") && endpoint.method !== "DELETE") {
      msgs.push(`Delete operation "${endpoint.path}" should use DELETE method.`);
    }
  }

  return msgs;
}

function isVerb(word: string): boolean {
  const commonVerbs = [
    "create", "update", "delete", "get", "fetch", "send", "post", "put", 
    "add", "remove", "insert", "modify", "change", "save", "load", "retrieve"
  ];
  return commonVerbs.includes(word.toLowerCase());
}
