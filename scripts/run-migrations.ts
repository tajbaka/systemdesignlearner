#!/usr/bin/env tsx
/**
 * Script to run database migrations from SQL files
 *
 * Usage:
 *   npm run db:migrate
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, readdirSync } from "fs";
import postgres from "postgres";

// Load environment variables from .env.local
const rootEnvPath = resolve(process.cwd(), ".env.local");
config({ path: rootEnvPath });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ POSTGRES_URL environment variable is not set");
  process.exit(1);
}

async function runMigrations() {
  console.log("🌱 Running database migrations...\n");

  const client = postgres(connectionString!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Get all migration files from supabase/migrations directory
    const migrationsDir = resolve(process.cwd(), "supabase/migrations");
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Sort to ensure correct order

    if (files.length === 0) {
      console.log("⚠️  No migration files found in supabase/migrations");
      return;
    }

    console.log(`📋 Found ${files.length} migration file(s)\n`);

    for (const file of files) {
      const filePath = resolve(migrationsDir, file);
      const sql = readFileSync(filePath, "utf-8");

      console.log(`📝 Running migration: ${file}`);

      // Split by statement-breakpoint and execute each statement
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let successCount = 0;
      let skippedCount = 0;

      for (const statement of statements) {
        if (!statement.trim()) continue;

        try {
          await client.unsafe(statement);
          successCount++;
        } catch (error: unknown) {
          // Type guard for PostgresError
          const isPostgresError = (e: unknown): e is { message?: string; code?: string } => {
            return typeof e === "object" && e !== null && ("message" in e || "code" in e);
          };

          if (!isPostgresError(error)) {
            throw error;
          }

          // Check if it's a "already exists" error (table, type, etc.)
          const isAlreadyExists =
            error.message?.includes("already exists") ||
            error.code === "42P07" || // duplicate_table
            error.code === "42710" || // duplicate_object
            error.code === "42P16" || // duplicate_object
            error.code === "42723"; // duplicate_function

          // Check if it's a "does not exist" error for RLS operations
          const isDoesNotExist =
            error.message?.includes("does not exist") || error.code === "42P01"; // undefined_table

          if (isAlreadyExists) {
            skippedCount++;
            // Continue to next statement
          } else if (isDoesNotExist && statement.toUpperCase().includes("ALTER TABLE")) {
            // Skip RLS operations if table doesn't exist
            skippedCount++;
            console.log(`   ⚠️  Skipped (table doesn't exist): ${statement.substring(0, 50)}...`);
          } else {
            // Real error - throw it
            throw error;
          }
        }
      }

      if (successCount > 0 || skippedCount === statements.length) {
        console.log(
          `   ✅ Completed: ${file} (${successCount} executed, ${skippedCount} skipped)\n`
        );
      } else {
        console.log(`   ⚠️  All statements skipped: ${file}\n`);
      }
    }

    console.log("🎉 All migrations completed successfully!");
  } catch (error) {
    console.error("❌ Error running migrations:", error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations()
  .then(() => {
    console.log("👋 Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
