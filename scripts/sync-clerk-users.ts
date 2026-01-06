/**
 * One-time script to sync existing Clerk users to the profiles table.
 * Generates SQL and runs via Supabase CLI.
 *
 * Run with: npx tsx scripts/sync-clerk-users.ts
 */

import "dotenv/config";
import { createClerkClient } from "@clerk/backend";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

function escapeSQL(str: string | null): string {
  if (str === null) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

async function syncClerkUsers() {
  // Initialize Clerk client
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  console.log("🔄 Fetching Clerk users...\n");

  const users: Array<{
    id: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }> = [];

  let offset = 0;
  const limit = 100;

  // Paginate through all users
  while (true) {
    const response = await clerk.users.getUserList({
      limit,
      offset,
    });

    if (response.data.length === 0) {
      break;
    }

    for (const user of response.data) {
      const email = user.emailAddresses[0]?.emailAddress ?? null;
      const displayName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : null;

      users.push({
        id: user.id,
        email,
        displayName,
        avatarUrl: user.imageUrl ?? null,
      });

      console.log(`📥 Found: ${email || user.id}`);
    }

    offset += limit;

    if (response.data.length < limit) {
      break;
    }
  }

  console.log(`\n📊 Found ${users.length} users in Clerk\n`);

  if (users.length === 0) {
    console.log("No users to sync.");
    return;
  }

  // Generate SQL with ON CONFLICT DO NOTHING
  const sqlStatements = users.map(
    (user) => `INSERT INTO profiles (clerk_user_id, email, display_name, avatar_url)
VALUES (${escapeSQL(user.id)}, ${escapeSQL(user.email)}, ${escapeSQL(user.displayName)}, ${escapeSQL(user.avatarUrl)})
ON CONFLICT (clerk_user_id) DO NOTHING;`
  );

  const sql = sqlStatements.join("\n");

  // Create a timestamped migration file
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const migrationFile = `supabase/migrations/${timestamp}_sync_clerk_users.sql`;

  writeFileSync(migrationFile, sql);
  console.log(`📝 Created migration: ${migrationFile}\n`);

  try {
    console.log("🚀 Pushing migration via Supabase CLI...\n");
    execSync(`supabase db push --linked`, {
      stdio: "inherit",
    });
    console.log("\n✅ Sync complete!");

    // Remove the migration file after successful push
    unlinkSync(migrationFile);
    console.log("🧹 Cleaned up migration file");
  } catch (error) {
    console.error("\n❌ Failed to push migration:", error);
    console.log(`\n💡 Migration file kept at: ${migrationFile}`);
    console.log("   You can manually run it or delete it.");
  }
}

syncClerkUsers().catch(console.error);
