#!/usr/bin/env node
/**
 * Script to verify RLS is enabled on all tables
 *
 * Usage:
 *   node scripts/verify-rls.mjs
 */

import postgres from "postgres";

const POSTGRES_URL = process.env.POSTGRES_URL;

async function verifyRLS() {
  if (!POSTGRES_URL) {
    console.error("❌ POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🔗 Connecting to database...");
  const sql = postgres(POSTGRES_URL, {
    max: 1,
  });

  try {
    // Get RLS status for all tables in public schema
    console.log("🔍 Checking RLS status...\n");
    const rlsStatus = await sql`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log("📋 RLS Status:");
    console.log("─────────────────────────────────────────────────────");
    rlsStatus.forEach((table) => {
      const status = table.rls_enabled ? "✅ ENABLED" : "❌ DISABLED";
      console.log(`  ${status.padEnd(12)} ${table.tablename}`);
    });
    console.log("─────────────────────────────────────────────────────");

    // Get policies for each table
    console.log("\n🔍 Checking RLS policies...\n");
    const policies = await sql`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `;

    console.log("📋 RLS Policies:");
    console.log("─────────────────────────────────────────────────────");
    if (policies.length === 0) {
      console.log("  ⚠️  No policies found!");
    } else {
      let currentTable = null;
      policies.forEach((policy) => {
        if (currentTable !== policy.tablename) {
          if (currentTable !== null) console.log("");
          console.log(`  📄 ${policy.tablename}:`);
          currentTable = policy.tablename;
        }
        console.log(`    • ${policy.policyname} (${policy.cmd})`);
      });
    }
    console.log("─────────────────────────────────────────────────────");

    // Verify all tables have RLS enabled
    const allEnabled = rlsStatus.every((t) => t.rls_enabled);
    const expectedTables = [
      "profiles",
      "problems",
      "problem_versions",
      "problem_steps",
      "user_problems",
      "user_problem_steps",
    ];

    console.log("\n✅ Verification Summary:");
    console.log("─────────────────────────────────────────────────────");
    expectedTables.forEach((expected) => {
      const table = rlsStatus.find((t) => t.tablename === expected);
      const status = table?.rls_enabled ? "✅" : "❌";
      console.log(`  ${status} ${expected}`);
    });
    console.log("─────────────────────────────────────────────────────");

    if (allEnabled) {
      console.log("\n🎉 All tables have RLS enabled!");
    } else {
      console.log("\n⚠️  Some tables do not have RLS enabled!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error verifying RLS:", error);
    throw error;
  } finally {
    await sql.end();
    console.log("\n👋 Database connection closed");
  }
}

// Run the script
verifyRLS().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
