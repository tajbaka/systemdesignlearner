// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDevelopment = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: "https://abe92b604a2e2f6bd12af2525eb94b12@o4509992458387456.ingest.us.sentry.io/4509992460746752",

  // Performance Monitoring - adjust sample rate based on environment
  // Production: 10% of transactions, Development: 100% for debugging
  tracesSampleRate: isDevelopment ? 1.0 : 0.1,

  // Session Replay - capture 10% of all sessions
  replaysSessionSampleRate: 0.1,

  // Session Replay - capture 100% of sessions with errors
  replaysOnErrorSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      // Block all media elements (images, video, audio)
      blockAllMedia: true,
    }),
  ],

  // Security: Filter sensitive data before sending to Sentry
  beforeSend(event, _hint) {
    // Don't send events in development
    if (isDevelopment) {
      return null;
    }

    // Remove sensitive data from event
    if (event.request) {
      // Remove query parameters that might contain tokens
      delete event.request.query_string;
      // Remove cookies
      delete event.request.cookies;
      // Sanitize headers
      if (event.request.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
        delete event.request.headers["X-Auth-Token"];
      }
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          // Remove any data that looks like tokens or passwords
          const sanitized = { ...breadcrumb.data };
          Object.keys(sanitized).forEach((key) => {
            if (
              key.toLowerCase().includes("token") ||
              key.toLowerCase().includes("password") ||
              key.toLowerCase().includes("secret") ||
              key.toLowerCase().includes("api_key") ||
              key.toLowerCase().includes("apikey")
            ) {
              sanitized[key] = "[Filtered]";
            }
          });
          return { ...breadcrumb, data: sanitized };
        }
        return breadcrumb;
      });
    }

    return event;
  },

  // Filter out common noise and errors we can't control
  ignoreErrors: [
    // Browser extension errors
    "top.GLOBALS",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    // Random plugins/extensions
    "fb_xd_fragment",
    "bmi_SafeAddOnload",
    "EBCallBackMessageReceived",
    // Network errors that are expected
    "Non-Error promise rejection captured",
    "Network request failed",
    "NetworkError",
    "Failed to fetch",
    // ResizeObserver errors (harmless)
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],

  // Don't capture errors from these URLs (3rd party scripts, browser extensions)
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    // Common 3rd party scripts
    /graph\.facebook\.com/i,
    /connect\.facebook\.net/i,
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
