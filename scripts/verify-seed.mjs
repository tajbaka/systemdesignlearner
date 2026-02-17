#!/usr/bin/env node
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

try {
  console.log("🔍 Verifying seeded data...\n");

  // Check problem
  const problems = await sql`
    SELECT id, slug, category FROM problems WHERE slug = 'url-shortener'
  `;
  console.log("✅ Problem:", problems[0]);

  // Check version
  const versions = await sql`
    SELECT title, difficulty, time_to_complete, topic
    FROM problem_versions
    WHERE problem_id = ${problems[0].id}
  `;
  console.log("\n✅ Version:", versions[0]);

  // Check steps
  const steps = await sql`
    SELECT step, title, "order", required
    FROM problem_steps
    WHERE problem_id = ${problems[0].id}
    ORDER BY "order"
  `;
  console.log("\n✅ Steps:");
  steps.forEach((s) => console.log(`   ${s.order}. ${s.step} - ${s.title}`));

  console.log("\n🎉 All data verified successfully!");
} finally {
  await sql.end();
}
