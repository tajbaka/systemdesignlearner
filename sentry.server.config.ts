// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: "https://abe92b604a2e2f6bd12af2525eb94b12@o4509992458387456.ingest.us.sentry.io/4509992460746752",

  // Performance Monitoring - adjust sample rate based on environment
  // Production: 20% of transactions (server-side needs higher rate), Development: 100%
  tracesSampleRate: isDevelopment ? 1.0 : 0.2,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Security: Filter sensitive data before sending to Sentry
  beforeSend(event, _hint) {
    // Don't send events in development
    if (isDevelopment) {
      return null;
    }

    // Remove sensitive data from event
    if (event.request) {
      // Remove cookies and auth headers
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
        delete event.request.headers["X-Auth-Token"];
      }
    }

    // Remove environment variables that might contain secrets
    if (event.contexts?.runtime?.env) {
      const sanitized: Record<string, string> = {};
      const envVars = event.contexts.runtime.env as Record<string, string>;
      Object.keys(envVars).forEach((key) => {
        if (
          key.includes("KEY") ||
          key.includes("SECRET") ||
          key.includes("TOKEN") ||
          key.includes("PASSWORD")
        ) {
          sanitized[key] = "[Filtered]";
        } else {
          sanitized[key] = envVars[key];
        }
      });
      event.contexts.runtime.env = sanitized;
    }

    return event;
  },

  // Filter out common errors
  ignoreErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "Network request failed"],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
