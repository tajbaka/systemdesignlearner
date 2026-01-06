"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { PracticeState } from "@/lib/practice/types";
import { migrateLocalStorageToDb } from "@/lib/actions/practice";
import { logger } from "@/lib/logger";

const MIGRATION_FLAG_KEY = "sds-db-migration-completed";
const PRACTICE_KEY_PREFIX = "sds-practice-";

type MigrationStatus = "idle" | "pending" | "migrating" | "completed" | "error";

type UseMigrationResult = {
  status: MigrationStatus;
  error: string | null;
  migratedCount: number;
  skippedCount: number;
  /** Manually trigger a retry of the migration */
  retry: () => void;
};

/**
 * Hook that handles one-time migration of localStorage practice sessions to DB.
 * Automatically runs when a user signs in and has localStorage data to migrate.
 *
 * Key behaviors:
 * - Only marks migration as complete if it actually succeeds
 * - Retries automatically on next page load if migration fails
 * - Provides manual retry function for immediate retry
 */
export function useLocalStorageMigration(): UseMigrationResult {
  const { isSignedIn, isLoaded } = useAuth();
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [migratedCount, setMigratedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const migrationInProgressRef = useRef(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retry = () => {
    if (status === "error" || status === "idle") {
      setError(null);
      setRetryTrigger((prev) => prev + 1);
    }
  };

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return;

    // Only run for authenticated users
    if (!isSignedIn) {
      setStatus("idle");
      return;
    }

    // Prevent concurrent migration attempts
    if (migrationInProgressRef.current) return;

    // Check if migration was already successfully done
    if (typeof window === "undefined") return;

    const migrationCompleted = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationCompleted === "true") {
      setStatus("completed");
      return;
    }

    const runMigration = async () => {
      migrationInProgressRef.current = true;
      setStatus("migrating");
      setError(null);

      try {
        // Collect all practice sessions from localStorage
        const localSessions: Record<string, PracticeState> = {};

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(PRACTICE_KEY_PREFIX)) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw) as PracticeState;
                if (parsed && parsed.slug) {
                  localSessions[key] = parsed;
                }
              }
            } catch (parseError) {
              logger.warn(`Failed to parse localStorage key ${key}`, parseError);
            }
          }
        }

        // If no sessions to migrate, mark as complete
        if (Object.keys(localSessions).length === 0) {
          localStorage.setItem(MIGRATION_FLAG_KEY, "true");
          setStatus("completed");
          migrationInProgressRef.current = false;
          return;
        }

        // Migrate to database
        const result = await migrateLocalStorageToDb(localSessions);

        setMigratedCount(result.migrated);
        setSkippedCount(result.skipped);

        if (result.success) {
          // Only mark as complete if migration actually succeeded
          localStorage.setItem(MIGRATION_FLAG_KEY, "true");
          setStatus("completed");
          logger.info("localStorage migration completed", {
            migrated: result.migrated,
            skipped: result.skipped,
          });
        } else {
          // Migration failed - don't set flag, will retry on next load
          setError(result.error ?? "Migration failed. Will retry on next page load.");
          setStatus("error");
          logger.error("localStorage migration failed", { error: result.error });
        }
      } catch (migrationError) {
        logger.error("localStorage migration threw exception", migrationError);
        setError(
          migrationError instanceof Error
            ? migrationError.message
            : "Unknown error during migration"
        );
        setStatus("error");
      } finally {
        migrationInProgressRef.current = false;
      }
    };

    runMigration();
  }, [isSignedIn, isLoaded, retryTrigger]);

  return {
    status,
    error,
    migratedCount,
    skippedCount,
    retry,
  };
}

/**
 * Utility to reset migration flag (for testing or re-migration)
 */
export function resetMigrationFlag(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(MIGRATION_FLAG_KEY);
  }
}
