import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// For use in server components and server actions
// Uses the service role key for full database access

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// Create postgres client
// For serverless environments, we use a connection pool with appropriate settings
const client = postgres(connectionString, {
  max: 1, // Single connection for serverless
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // 10 second connection timeout
});

// Create drizzle instance with schema for relations
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from "./schema";
