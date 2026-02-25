#!/usr/bin/env tsx
/**
 * Script to seed the database with initial problem data
 *
 * Usage:
 *   npm run seed                                    # No changes (lists problems only)
 *   npm run seed -- --update url-shortener          # Update specific problem, preserves user data
 *   npm run seed -- --update url-shortener,pastebin # Update multiple problems, preserves user data
 *   npm run seed -- --force                         # Force: overwrites ALL problems, deletes ALL user data
 *   npm run seed -- --update web-crawler --notify   # Update + send PostHog events for new problems
 *
 * Or directly:
 *   npx tsx packages/seed.ts
 *   npx tsx packages/seed.ts --update url-shortener
 *   npx tsx packages/seed.ts --update web-crawler --notify
 *   npx tsx packages/seed.ts --force
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PostHog } from "posthog-node";
import { URL_SHORTENER_PROBLEM } from "./problems/url-shortener";
import { PASTEBIN_PROBLEM } from "./problems/pastebin";
import { RATE_LIMITER_PROBLEM } from "./problems/rate-limiter";
import { NOTIFICATION_SYSTEM_PROBLEM } from "./problems/notification-system";
import { WHATSAPP_PROBLEM } from "./problems/whatsapp";
import { LEADERBOARD_PROBLEM } from "./problems/leaderboard";
import { JOB_SCHEDULER_PROBLEM } from "./problems/job-scheduler";
import { PAYMENT_SYSTEM_PROBLEM } from "./problems/payment-system";
import { DROPBOX_PROBLEM } from "./problems/dropbox";
import { WEB_CRAWLER_PROBLEM } from "./problems/web-crawler";

// Load environment variables - .env.local first (overrides), then .env (defaults)
const rootEnvLocalPath = resolve(process.cwd(), ".env.local");
const rootEnvPath = resolve(process.cwd(), ".env");

const result = config({ path: rootEnvLocalPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  console.log("Tried paths:", rootEnvLocalPath);
  process.exit(1);
}

// Also load .env for keys not in .env.local (e.g. NEXT_PUBLIC_POSTHOG_KEY)
config({ path: rootEnvPath });

if (!process.env.POSTGRES_URL) {
  console.error("❌ POSTGRES_URL not found in .env.local");
  console.log(
    "Available env vars:",
    Object.keys(process.env).filter((k) => k.includes("POSTGRES") || k.includes("DATABASE"))
  );
  process.exit(1);
}

console.log("✅ Loaded .env.local successfully");
console.log("POSTGRES_URL exists:", !!process.env.POSTGRES_URL);

// Problem data
const PROBLEMS = [
  URL_SHORTENER_PROBLEM,
  PASTEBIN_PROBLEM,
  RATE_LIMITER_PROBLEM,
  NOTIFICATION_SYSTEM_PROBLEM,
  WHATSAPP_PROBLEM,
  LEADERBOARD_PROBLEM,
  JOB_SCHEDULER_PROBLEM,
  PAYMENT_SYSTEM_PROBLEM,
  DROPBOX_PROBLEM,
  WEB_CRAWLER_PROBLEM,
];

async function seedProblem(
  problemData: (typeof PROBLEMS)[number],
  forceMode = false,
  isExplicitUpdate = false
) {
  // Dynamically import drizzle AFTER env vars are loaded
  const { db, problems, problemVersions, problemSteps, userProblems, userProblemSteps } =
    await import("./drizzle");
  const { eq } = await import("drizzle-orm");

  console.log(`\n🔍 Processing problem "${problemData.slug}"...`);
  const existingProblem = await db.query.problems.findFirst({
    where: eq(problems.slug, problemData.slug),
    with: {
      versions: true,
      steps: true,
    },
  });

  // Skip existing problems unless force mode or explicit update is enabled
  if (existingProblem && !forceMode && !isExplicitUpdate) {
    console.log(
      `   ⏭️  Problem "${problemData.slug}" already exists - SKIPPING to preserve user data`
    );
    console.log(`   💡 Use --update ${problemData.slug} to update or --force to overwrite`);
    return { skipped: true, slug: problemData.slug };
  }

  let problemId: string;

  if (existingProblem) {
    problemId = existingProblem.id;

    if (forceMode) {
      console.log(`   🔄 FORCE MODE: Overwriting problem...`);
    } else {
      console.log(`   🔄 Updating problem definition...`);
    }

    // Update problem category if changed
    if (existingProblem.category !== problemData.category) {
      await db
        .update(problems)
        .set({ category: problemData.category })
        .where(eq(problems.id, problemId));
      console.log(`   ✅ Updated problem category`);
    }

    if (forceMode) {
      // Force mode: delete user data first, then delete and recreate everything
      console.log("   🗑️  FORCE MODE: Deleting user progress data...");
      const userProblemsToDelete = await db.query.userProblems.findMany({
        where: eq(userProblems.problemId, problemId),
      });

      if (userProblemsToDelete.length > 0) {
        for (const up of userProblemsToDelete) {
          await db.delete(userProblemSteps).where(eq(userProblemSteps.userProblemId, up.id));
        }
        await db.delete(userProblems).where(eq(userProblems.problemId, problemId));
        console.log(`   ✅ Deleted ${userProblemsToDelete.length} user progress record(s)`);
      } else {
        console.log(`   ℹ️  No user progress to delete`);
      }

      // Now safe to delete versions and steps
      if (existingProblem.versions.length > 0) {
        console.log(`   🗑️  Deleting ${existingProblem.versions.length} existing version(s)...`);
        await db.delete(problemVersions).where(eq(problemVersions.problemId, problemId));
      }

      if (existingProblem.steps.length > 0) {
        console.log(`   🗑️  Deleting ${existingProblem.steps.length} existing step(s)...`);
        await db.delete(problemSteps).where(eq(problemSteps.problemId, problemId));
      }
    } else {
      // Safe mode: preserve user data, update versions in place, recreate steps
      console.log(`   ℹ️  Preserving user progress (use --force to delete)`);

      // Update existing version in place (if exists)
      if (existingProblem.versions.length > 0) {
        console.log(`   🔄 Updating existing version...`);
        const existingVersion = existingProblem.versions[0];
        await db
          .update(problemVersions)
          .set({
            versionNumber: problemData.version.versionNumber,
            title: problemData.version.title,
            description: problemData.version.description,
            difficulty: problemData.version.difficulty,
            timeToComplete: problemData.version.timeToComplete,
            topic: problemData.version.topic,
            links: problemData.version.links,
            isCurrent: problemData.version.isCurrent,
          })
          .where(eq(problemVersions.id, existingVersion.id));
        console.log(`   ✅ Updated version ${existingVersion.id}`);
      }

      // Steps can be safely deleted and recreated (no direct user_problems FK)
      if (existingProblem.steps.length > 0) {
        console.log(`   🗑️  Deleting ${existingProblem.steps.length} existing step(s)...`);
        await db.delete(problemSteps).where(eq(problemSteps.problemId, problemId));
      }
    }
  } else {
    // New problem: insert
    console.log("   ✨ Creating new problem...");
    const [newProblem] = await db
      .insert(problems)
      .values({
        slug: problemData.slug,
        category: problemData.category,
      })
      .returning();
    problemId = newProblem.id;
    console.log(`   ✅ Created problem: ${newProblem.slug} (${problemId})`);
  }

  // Insert problem version (only if new problem or force mode deleted the old one)
  const needsVersionInsert = !existingProblem || forceMode;
  if (needsVersionInsert) {
    console.log("   ✨ Creating problem version...");
    const version = problemData.version;
    const [newVersion] = await db
      .insert(problemVersions)
      .values({
        problemId,
        versionNumber: version.versionNumber,
        title: version.title,
        description: version.description,
        difficulty: version.difficulty,
        timeToComplete: version.timeToComplete,
        topic: version.topic,
        links: version.links,
        isCurrent: version.isCurrent,
      })
      .returning();
    console.log(`   ✅ Created version ${newVersion.versionNumber} (${newVersion.id})`);
  }

  // Insert problem steps
  console.log("   ✨ Creating problem steps...");
  for (const step of problemData.steps) {
    // Extract scoreWeight from data to set as column value
    const { scoreWeight, ...restData } = step.data as {
      scoreWeight?: number;
      [key: string]: unknown;
    };

    const [newStep] = await db
      .insert(problemSteps)
      .values({
        problemId,
        title: step.title,
        description: step.description,
        stepType: step.stepType,
        order: step.order,
        required: step.required,
        scoreWeight: scoreWeight ?? 0,
        data: restData,
      })
      .returning();
    console.log(
      `   ✅ Created step: ${newStep.stepType} - ${newStep.title} (scoreWeight: ${newStep.scoreWeight})`
    );
  }

  console.log("\n📋 Summary:");
  console.log("─────────────────────────────────────────");
  console.log(`  Problem: ${problemData.slug}`);
  console.log(`  Category: ${problemData.category}`);
  console.log(`  Title: ${problemData.version.title}`);
  console.log(`  Steps: ${problemData.steps.length}`);
  console.log("─────────────────────────────────────────\n");

  return {
    slug: problemData.slug,
    title: problemData.version.title,
    difficulty: problemData.version.difficulty,
    description: problemData.version.description,
    timeToComplete: problemData.version.timeToComplete,
    isNew: !existingProblem,
    updated: true,
  };
}

async function notifyUsersOfNewProblems(
  newProblems: {
    slug: string;
    title: string;
    difficulty: string;
    description: string;
    timeToComplete?: string;
  }[]
) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!posthogKey) {
    console.log("⚠️  NEXT_PUBLIC_POSTHOG_KEY not set — skipping PostHog notifications");
    return;
  }

  const posthog = new PostHog(posthogKey, { host: posthogHost });

  try {
    const { db, profiles } = await import("./drizzle");
    const { and, isNotNull, isNull } = await import("drizzle-orm");

    const users = await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(and(isNotNull(profiles.email), isNull(profiles.deletedAt)));

    console.log(`\n📧 Sending new_problem_available events to ${users.length} user(s)...`);

    for (const user of users) {
      for (const problem of newProblems) {
        posthog.capture({
          distinctId: user.email!,
          event: "new_problem_available",
          properties: {
            email: user.email!,
            problem_slug: problem.slug,
            problem_title: problem.title,
            problem_difficulty: problem.difficulty,
            problem_description: problem.description,
            time_to_complete: problem.timeToComplete || "45 minutes",
          },
        });
      }
    }

    await posthog.shutdown();
    console.log(`✅ Sent ${users.length * newProblems.length} new_problem_available event(s)`);
  } catch (error) {
    console.error("❌ Error sending PostHog notifications:", error);
    await posthog.shutdown();
  }
}

async function seedDatabase() {
  const args = process.argv.slice(2);
  const forceMode = args.includes("--force");
  const notifyMode = args.includes("--notify");

  // Parse --update flag
  const updateFlagIndex = args.findIndex((arg) => arg === "--update");
  const updateSlugs: string[] = [];

  if (updateFlagIndex !== -1 && args[updateFlagIndex + 1]) {
    const slugsArg = args[updateFlagIndex + 1];
    updateSlugs.push(...slugsArg.split(",").map((s) => s.trim()));
  }

  // Determine which problems to process
  let problemsToProcess = PROBLEMS;

  if (forceMode) {
    console.log("⚠️  FORCE MODE: Will overwrite ALL problems and delete ALL user data\n");
  } else if (updateSlugs.length > 0) {
    console.log(
      `🌱 Updating ${updateSlugs.length} problem(s): ${updateSlugs.join(", ")} (preserving user data)\n`
    );
    problemsToProcess = PROBLEMS.filter((p) => updateSlugs.includes(p.slug));

    // Warn about unknown slugs
    const validSlugs = PROBLEMS.map((p) => p.slug);
    const unknownSlugs = updateSlugs.filter((s) => !validSlugs.includes(s));
    if (unknownSlugs.length > 0) {
      console.log(`⚠️  Unknown problem slugs: ${unknownSlugs.join(", ")}`);
      console.log(`   Valid slugs: ${validSlugs.join(", ")}\n`);
    }
  } else {
    console.log("ℹ️  No problems selected for update. Use --update <slug> or --force\n");
    console.log("Available problems:");
    PROBLEMS.forEach((p) => console.log(`  - ${p.slug}`));
    console.log("\nExiting without changes.");
    return;
  }

  try {
    const results = [];
    for (const problem of problemsToProcess) {
      // isExplicitUpdate is true when using --update flag (not --force)
      const isExplicitUpdate = updateSlugs.length > 0 && !forceMode;
      const result = await seedProblem(problem, forceMode, isExplicitUpdate);
      results.push(result);
    }

    const newProblems = results.filter(
      (
        r
      ): r is typeof r & { isNew: true; title: string; difficulty: string; description: string } =>
        !!r.isNew
    );
    const updatedProblems = results.filter((r) => !r.isNew && r.updated);

    console.log("\n🎉 Database seed complete!");
    console.log("─────────────────────────────────────────");
    console.log(`  ✨ New: ${newProblems.length} problem(s)`);
    if (newProblems.length > 0) {
      newProblems.forEach((r) => console.log(`     - ${r.slug}`));
    }
    console.log(`  🔄 Updated: ${updatedProblems.length} problem(s)`);
    if (updatedProblems.length > 0) {
      updatedProblems.forEach((r) => console.log(`     - ${r.slug}`));
    }
    if (!forceMode && updatedProblems.length > 0) {
      console.log(`  ℹ️  User progress preserved`);
    }
    console.log("─────────────────────────────────────────");

    // Send PostHog events so workflows can trigger emails
    if (notifyMode) {
      // Notify for new problems, or for updated problems if no new ones
      const problemsToNotify: {
        slug: string;
        title: string;
        difficulty: string;
        description: string;
      }[] =
        newProblems.length > 0
          ? newProblems
          : updatedProblems
              .filter((r) => "title" in r && r.title)
              .map((r) => ({
                slug: r.slug,
                title: (r as { title: string }).title,
                difficulty: (r as { difficulty: string }).difficulty,
                description: (r as { description: string }).description,
              }));
      if (problemsToNotify.length > 0) {
        await notifyUsersOfNewProblems(problemsToNotify);
      } else {
        console.log("\n📧 --notify: No problems to notify about");
      }
    }
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the script
seedDatabase()
  .then(() => {
    console.log("👋 Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
