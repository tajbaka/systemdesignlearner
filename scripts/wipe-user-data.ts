#!/usr/bin/env tsx
/**
 * Script to wipe all data for a specific user by email.
 *
 * Deletes from: user_problem_steps, user_problems, and the profile itself.
 * (user_problem_steps and user_problems cascade from profiles, but we
 * delete explicitly for visibility and logging.)
 *
 * Usage:
 *   npx tsx scripts/wipe-user-data.ts <email>
 */

import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

// Load environment variables from .env.local
const rootEnvPath = resolve(process.cwd(), ".env.local");
config({ path: rootEnvPath });

const TARGET_EMAIL = process.argv[2];
if (!TARGET_EMAIL) {
  console.error("❌ Usage: npx tsx scripts/wipe-user-data.ts <email>");
  process.exit(1);
}

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ POSTGRES_URL environment variable is not set");
  process.exit(1);
}

async function wipeUserData() {
  console.log(`🔍 Looking up user: ${TARGET_EMAIL}\n`);

  const sql = postgres(connectionString!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // 1. Find the profile
    const profiles = await sql`
      SELECT id, clerk_user_id, email, display_name, created_at
      FROM profiles
      WHERE email = ${TARGET_EMAIL}
    `;

    if (profiles.length === 0) {
      console.log("⚠️  No user found with that email. Nothing to do.");
      return;
    }

    const profile = profiles[0];
    console.log(`👤 Found user:`);
    console.log(`   ID:        ${profile.id}`);
    console.log(`   Clerk ID:  ${profile.clerk_user_id}`);
    console.log(`   Email:     ${profile.email}`);
    console.log(`   Name:      ${profile.display_name || "(none)"}`);
    console.log(`   Created:   ${profile.created_at}\n`);

    const profileId = profile.id;

    // 2. Count related data before deletion
    const [userProblemsCount, userProblemStepsCount] = await Promise.all([
      sql`SELECT count(*)::int as count FROM user_problems WHERE user_id = ${profileId}`,
      sql`
        SELECT count(*)::int as count FROM user_problem_steps
        WHERE user_problem_id IN (
          SELECT id FROM user_problems WHERE user_id = ${profileId}
        )
      `,
    ]);

    console.log(`📊 Data to be deleted:`);
    console.log(`   user_problem_steps: ${userProblemStepsCount[0].count}`);
    console.log(`   user_problems:      ${userProblemsCount[0].count}`);
    console.log(`   profile:            1\n`);

    // 3. Delete everything — children first, then parents

    // Delete user_problem_steps (via user_problems)
    const deletedProblemSteps = await sql`
      DELETE FROM user_problem_steps
      WHERE user_problem_id IN (
        SELECT id FROM user_problems WHERE user_id = ${profileId}
      )
    `;
    console.log(`🗑️  Deleted user_problem_steps: ${deletedProblemSteps.count} rows`);

    // Delete user_problems
    const deletedProblems = await sql`
      DELETE FROM user_problems WHERE user_id = ${profileId}
    `;
    console.log(`🗑️  Deleted user_problems: ${deletedProblems.count} rows`);

    // Delete the profile itself
    const deletedProfile = await sql`
      DELETE FROM profiles WHERE id = ${profileId}
    `;
    console.log(`🗑️  Deleted profile: ${deletedProfile.count} rows`);

    console.log(`\n✅ All data for ${TARGET_EMAIL} has been wiped.`);
  } catch (error) {
    console.error("❌ Error wiping user data:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

wipeUserData()
  .then(() => {
    console.log("👋 Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
