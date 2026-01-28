import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

// Load environment variables from .env.local
const rootEnvPath = resolve(process.cwd(), ".env.local");
config({ path: rootEnvPath });

export default defineConfig({
  schema: "./packages/drizzle/schema/index.ts",
  out: "./database/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  verbose: true,
  strict: true,
});
