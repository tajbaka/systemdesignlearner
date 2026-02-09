import path from "path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isCI = Boolean(process.env.CI);

const nextConfig: NextConfig = {
  devIndicators: false,
  // Explicitly disable trailing slashes so all canonical URLs are /path (not /path/)
  trailingSlash: false,
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
    ];
  },
};

export default withSentryConfig(nextConfig, {
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
