const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const tsConfigPaths = require("tsconfig-paths");

require("ts-node").register({
  project: "./tsconfig.json",
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node",
    baseUrl: ".",
    paths: { "@/*": ["./*"] },
  },
});
tsConfigPaths.register({
  baseUrl: ".",
  paths: { "@/*": ["./*"] },
});
const { performance } = require("node:perf_hooks");
const { getIterativeFeedback } = require("../lib/scoring/ai/iterative");
const config = require("../lib/scoring/configs/url-shortener.json");

function buildFunctionalStepConfig() {
  const functional = config.steps.functional;
  const topics = [
    ...functional.coreRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
    })),
    ...functional.optionalRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
    })),
  ];

  return {
    stepId: "functional",
    stepName: "Functional Requirements",
    topics,
  };
}

async function main() {
  const step = buildFunctionalStepConfig();
  const sampleAnswer =
    "Users submit long URLs via the app and receive short slugs they can share. The service stores every mapping and returns the shortened link.";

  const iterations = 3;
  const durations = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await getIterativeFeedback(step, sampleAnswer);
    const duration = performance.now() - start;
    durations.push(duration);
    console.log(`Run ${i + 1}: ${(duration / 1000).toFixed(2)}s`);
  }

  const avg = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  console.log(`Average: ${(avg / 1000).toFixed(2)}s over ${iterations} runs`);
}

main().catch((error) => {
  console.error("Failed to profile iterative feedback:", error);
  if (error && error.cause) {
    console.error("Cause:", error.cause);
  }
  process.exit(1);
});
