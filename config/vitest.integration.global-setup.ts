import type { TestProject } from "vitest/node";

type DatabaseWithClient = {
  $client?: {
    end: (options?: { timeout?: number }) => Promise<void>;
  };
};

export default async function integrationGlobalSetup(_project: TestProject) {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL must be set before running integration tests");
  }

  return async () => {
    try {
      const { db } = await import("../packages/drizzle");
      await (db as DatabaseWithClient).$client?.end({ timeout: 0 });
    } catch {
      // Ignore teardown errors so failed tests still report cleanly.
    }
  };
}
