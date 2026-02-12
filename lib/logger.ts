/**
 * Logging utility with configurable log levels.
 *
 * Controlled via the LOG_LEVEL environment variable:
 *   - "debug"  — all logs (log, info, warn, error)
 *   - "info"   — info, warn, error (default)
 *   - "error"  — only errors
 *   - "silent" — nothing
 */

const LOG_LEVELS = { silent: 0, error: 1, info: 2, debug: 3 } as const;

type LogLevel = keyof typeof LOG_LEVELS;

function getLogLevel(): number {
  const env = (process.env.LOG_LEVEL?.toLowerCase() ?? "info") as LogLevel;
  return LOG_LEVELS[env] ?? LOG_LEVELS.info;
}

export const logger = {
  log: (...args: unknown[]) => {
    if (getLogLevel() >= LOG_LEVELS.debug) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (getLogLevel() >= LOG_LEVELS.error) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (getLogLevel() >= LOG_LEVELS.info) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (getLogLevel() >= LOG_LEVELS.info) {
      console.info(...args);
    }
  },
};
