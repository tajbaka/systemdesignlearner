#!/usr/bin/env node
/**
 * Script to verify database schema after migration
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-schema.mjs
 */

import postgres from "postgres";

const POSTGRES_URL = process.env.POSTGRES_URL;

async function verifySchema() {
  if (!POSTGRES_URL) {
    console.error("❌ POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🔗 Connecting to database...");
  const sql = postgres(POSTGRES_URL, {
    max: 1,
  });

  try {
    // Get all tables in the public schema
    console.log("🔍 Fetching all tables...\n");
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log("📋 Tables in database:");
    console.log("─────────────────────────────────────────");
    tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.tablename}`));
    console.log("─────────────────────────────────────────");

    // Get all custom types/enums
    console.log("\n🔍 Fetching all custom types...\n");
    const types = await sql`
      SELECT typname
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typtype = 'e'
      ORDER BY typname
    `;

    console.log("📋 Custom types/enums in database:");
    console.log("─────────────────────────────────────────");
    types.forEach((t, i) => console.log(`  ${i + 1}. ${t.typname}`));
    console.log("─────────────────────────────────────────");

    // Verify expected tables
    const expectedTables = [
      "profiles",
      "problems",
      "problem_versions",
      "problem_steps",
      "user_problems",
      "user_problem_steps",
    ];

    console.log("\n✅ Verification:");
    console.log("─────────────────────────────────────────");
    const tableNames = tables.map((t) => t.tablename);
    expectedTables.forEach((expected) => {
      const exists = tableNames.includes(expected);
      console.log(`  ${exists ? "✅" : "❌"} ${expected}`);
    });
    console.log("─────────────────────────────────────────");

    const allExist = expectedTables.every((t) => tableNames.includes(t));
    if (allExist) {
      console.log("\n🎉 All expected tables exist!");
    } else {
      console.log("\n⚠️  Some expected tables are missing!");
    }
  } catch (error) {
    console.error("❌ Error verifying schema:", error);
    throw error;
  } finally {
    await sql.end();
    console.log("\n👋 Database connection closed");
  }
}

// Run the script
verifySchema().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
