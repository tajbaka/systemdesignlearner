import type { PracticeState } from "./types";

const functionalOrder = [
  "create-short-url",
  "redirect-by-slug",
  "custom-alias",
  "basic-analytics",
  "rate-limiting",
  "admin-delete",
];

const functionalLabels: Record<string, string> = {
  "create-short-url": "Create short URLs",
  "redirect-by-slug": "Redirect by slug",
  "custom-alias": "Custom aliases",
  "basic-analytics": "Basic click analytics",
  "rate-limiting": "Client rate limiting",
  "admin-delete": "Admin delete",
};

const formatFunctional = (state: PracticeState): string[] => {
  const toggles = state.requirements?.functional;
  if (!toggles) {
    return ["Functional requirements TBD."];
  }

  return functionalOrder
    .filter((key) => key in toggles)
    .map((key) => `- ${functionalLabels[key] ?? key}: ${toggles[key] ? "Yes" : "No"}`);
};

const formatNonFunctional = (state: PracticeState): string[] => {
  const nf = state.requirements?.nonFunctional;
  if (!nf) {
    return ["Non-functional constraints TBD."];
  }

  return [
    `- Read QPS: ${nf.readRps.toLocaleString()}/s`,
    `- Write QPS: ${nf.writeRps.toLocaleString()}/s`,
    `- P95 redirect latency: ${nf.p95RedirectMs} ms`,
    `- Availability: ${nf.availability}%`,
  ];
};

const formatHighLevel = (state: PracticeState): string[] => {
  const high = state.high;
  if (!high) {
    return ["Architecture pending."];
  }

  const lines = [`Preset: ${high.presetId}`];
  lines.push("Components:");
  high.components.forEach((c) => {
    lines.push(`- ${c}`);
  });
  if (high.notes?.length) {
    lines.push("Notes:");
    high.notes.forEach((note) => {
      lines.push(`- ${note}`);
    });
  }
  return lines;
};

const formatSchemas = (state: PracticeState): string[] => {
  const schemas = state.low?.schemas;
  if (!schemas) {
    return ["Schemas pending."];
  }

  return Object.entries(schemas).flatMap(([name, schema]) => [
    `### ${name} Schema`,
    "```json",
    schema.trim(),
    "```",
  ]);
};

const formatApis = (state: PracticeState): string[] => {
  const apis = state.low?.apis;
  if (!apis?.length) {
    return ["APIs pending."];
  }

  const lines = ["Method | Path | Notes", "--- | --- | ---"];
  apis.forEach((api) => {
    lines.push(
      `${api.method} | ${api.path} | ${api.notes ? api.notes.replace(/\|/g, "\\|") : ""}`
    );
  });
  return lines;
};

const formatCapacity = (state: PracticeState): string[] => {
  const low = state.low;
  const nf = state.requirements?.nonFunctional;
  if (!low || !nf) {
    return ["Capacity assumptions pending."];
  }

  const { cacheHit, avgWritesPerCreate } = low.capacityAssumptions;
  const readRps = nf.readRps;
  const missRate = Math.max(0, Math.min(100, 100 - cacheHit));
  const dbReadQps = readRps * (missRate / 100);

  const lines = [
    `- Read path: ${readRps.toLocaleString()}/s with cache hit ${cacheHit}% → DB reads ~${Math.round(dbReadQps)} /s`,
    `- Avg writes per redirect create: ${avgWritesPerCreate}`,
  ];

  if (dbReadQps > nf.writeRps * 2) {
    lines.push("- Hint: Consider stronger caching or read replicas; DB load is high.");
  } else if (dbReadQps > nf.writeRps) {
    lines.push("- Hint: Miss traffic rivals write traffic; ensure DB scaling plan.");
  } else {
    lines.push("- DB read load is within expected limits.");
  }

  return lines;
};

export const toMarkdown = (state: PracticeState): string => {
  const lines: string[] = ["# URL Shortener (Easy)", ""];

  lines.push("## Requirements");
  lines.push(...formatFunctional(state));
  lines.push("", "Non-functional:");
  lines.push(...formatNonFunctional(state));

  lines.push("", "## High-Level Architecture");
  lines.push(...formatHighLevel(state));

  lines.push("", "## Low-Level Design");
  lines.push(...formatSchemas(state));
  lines.push("", "### APIs");
  lines.push(...formatApis(state));

  lines.push("", "### Capacity Assumptions");
  lines.push(...formatCapacity(state));

  return lines.join("\n");
};
