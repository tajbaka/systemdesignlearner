import path from "path";
import { withSentryConfig } from "@sentry/nextjs";
import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const isCI = Boolean(process.env.CI);
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Explicitly disable trailing slashes so all canonical URLs are /path (not /path/)
  trailingSlash: false,
  // Allow browsers to report full error details for cross-origin scripts (fixes "Script error.")
  crossOrigin: "anonymous",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
    ],
  },
  webpack(config, { dev }) {
    // Avoid webpack persisting very large serialized strings to disk while keeping repeat builds fast.
    // Use an in-memory cache in dev for responsiveness and fall back to the filesystem cache for production builds.
    config.cache = dev ? { type: "memory" } : { type: "filesystem" };

    if (!dev) {
      config.module?.rules?.push({
        test: /node_modules[\\/]lucide-react[\\/]dist[\\/]esm[\\/]icons[\\/].*\\.js$/,
        use: [
          {
            loader: path.resolve(__dirname, "scripts/strip-sourcemap-comment-loader.js"),
          },
        ],
      });
    }
    return config;
  },
  typescript: {
    // Use CI for type safety so local builds avoid duplicate work.
    ignoreBuildErrors: !isCI,
  },
  outputFileTracingRoot: __dirname,

  // Security headers for SEO trust signals and user protection
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-eval only in dev (HMR); never shipped to production
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://us.i.posthog.com https://us-assets.i.posthog.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.posthog.com",
              "font-src 'self'",
              "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://*.clerk.accounts.dev https://*.sentry.io https://api.resend.com https://vitals.vercel-insights.com",
              "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
              "frame-ancestors 'none'",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.clerk.accounts.dev",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // PostHog proxy: use /ph (not /ingest) so ad blockers are less likely to block by path
  async rewrites() {
    const rewrites = [
      {
        source: "/ph/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ph/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
    return rewrites;
  },

  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Canonical URL redirects for SEO
  async redirects() {
    return [
      // Redirect non-www to www
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "systemdesignsandbox.com",
          },
        ],
        destination: "https://www.systemdesignsandbox.com/:path*",
        permanent: true,
      },
      // Clean up ghost URLs that Google has crawled as 404
      { source: "/examples", destination: "/practice", permanent: true },
      { source: "/interview-guide", destination: "/learn/introduction", permanent: true },
      { source: "/docs", destination: "/", permanent: true },
    ];
  },
};

// PostHog sourcemap upload: wraps config so PostHog receives sourcemaps before Sentry deletes them
const withPostHog = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY ?? "",
  envId: process.env.POSTHOG_ENV_ID ?? "",
  host: "https://us.i.posthog.com",
  sourcemaps: {
    enabled: isCI,
    // Let Sentry handle deletion — PostHog should not delete since it runs first
    deleteAfterUpload: false,
  },
});

export default withSentryConfig(withPostHog, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "antoniocoppe",

  project: "system-design-sandbox",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: isCI,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Configure source map handling
  sourcemaps: {
    // Ignore third-party library source maps to reduce noise and processing time
    ignore: ["node_modules"],
    // Delete source maps after upload for security
    deleteSourcemapsAfterUpload: true,
  },
});
