#!/usr/bin/env node

// Only generate sitemap in CI/production environments
// This prevents sitemap from being regenerated during local pre-push builds
if (process.env.CI || process.env.VERCEL || process.env.NODE_ENV === "production") {
  const { execSync } = require("child_process");
  execSync("next-sitemap", { stdio: "inherit" });
} else {
  console.log("Skipping sitemap generation (not in CI/production)");
}
